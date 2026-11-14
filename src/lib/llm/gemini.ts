// Adapter Google Gemini (pakai SDK resmi @google/genai).
import "server-only";
import { GoogleGenAI, type GenerateContentConfig, type ThinkingLevel } from "@google/genai";
import type { LlmAdapter, ResolvedProvider } from "./types";

const clients = new Map<string, GoogleGenAI>();

function getClient(p: ResolvedProvider): GoogleGenAI {
  const key = `${p.apiKey}|${p.baseUrl}`;
  let client = clients.get(key);
  if (!client) {
    client = new GoogleGenAI({ apiKey: p.apiKey, ...(p.baseUrl ? { httpOptions: { baseUrl: p.baseUrl } } : {}) });
    clients.set(key, client);
  }
  return client;
}

/** Config dasar + thinking level opsional dari env (MINIMAL/LOW/MEDIUM/HIGH). */
function baseConfig(extra: GenerateContentConfig = {}): GenerateContentConfig {
  const level = process.env.GEMINI_THINKING_LEVEL?.trim().toUpperCase();
  return {
    temperature: 0.7,
    ...(level ? { thinkingConfig: { thinkingLevel: level as ThinkingLevel } } : {}),
    ...extra,
  };
}

export const geminiAdapter: LlmAdapter = {
  async *streamText(p, req) {
    const response = await getClient(p).models.generateContentStream({
      model: p.model,
      contents: req.user,
      config: baseConfig({
        systemInstruction: req.system,
        abortSignal: req.signal,
        ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
      }),
    });
    for await (const part of response) {
      if (part.text) yield part.text;
    }
  },

  async generateJson(p, req) {
    const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [{ text: req.user }];
    if (req.image) parts.push({ inlineData: { mimeType: req.image.mimeType, data: req.image.data } });
    const response = await getClient(p).models.generateContent({
      model: p.model,
      contents: [{ role: "user", parts }],
      config: baseConfig({
        systemInstruction: req.system,
        responseMimeType: "application/json",
        responseJsonSchema: req.schema,
        abortSignal: req.signal,
        ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
      }),
    });
    const raw = response.text ?? "";
    if (!raw.trim()) {
      const reason = response.candidates?.[0]?.finishReason ?? response.promptFeedback?.blockReason ?? "unknown";
      throw new Error(`Gemini nggak ngasih jawaban (alasan: ${reason}).`);
    }
    return raw;
  },

  async listModels(p, signal) {
    const pager = await getClient(p).models.list({ config: { pageSize: 100, abortSignal: signal } });
    const ids: string[] = [];
    for await (const m of pager) {
      if (!m.name) continue;
      if (m.supportedActions && !m.supportedActions.includes("generateContent")) continue;
      ids.push(m.name.replace(/^models\//, ""));
    }
    return ids;
  },
};
