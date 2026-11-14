// Adapter OpenAI-compatible (/chat/completions). Dipakai OpenAI, 9Router, OpenRouter, Groq,
// DeepSeek, Mistral, Together, Ollama, LM Studio, dan endpoint custom.
import "server-only";
import { errorFromResponse, LlmError, safeFetch } from "./errors.ts";
import { readSse } from "./sse.ts";
import { createThinkFilter, stripThink } from "./thinkFilter.ts";
import type { LlmAdapter, ResolvedProvider } from "./types";

type Body = Record<string, unknown>;

function headers(p: ResolvedProvider): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (p.apiKey) h.Authorization = `Bearer ${p.apiKey}`;
  if (p.meta.id === "openrouter") {
    h["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL?.trim() || "http://localhost:3000";
    h["X-Title"] = "AutoTL";
  }
  return h;
}

/** Parameter yang sering ditolak model tertentu (mis. model reasoning nolak temperature). */
const OPTIONAL_KEYS = ["temperature", "response_format"] as const;

/**
 * POST ke /chat/completions. Kalau ditolak 400 gara-gara temperature / response_format,
 * ulang sekali tanpa parameter itu (biar model/router yang kurang lengkap tetap jalan).
 */
async function post(p: ResolvedProvider, body: Body, signal?: AbortSignal): Promise<Response> {
  const send = (b: Body) =>
    safeFetch(p, `${p.baseUrl}/chat/completions`, { method: "POST", headers: headers(p), body: JSON.stringify(b), signal });

  const res = await send(body);
  if (res.ok) return res;
  const err = await errorFromResponse(res);
  const hasOptional = OPTIONAL_KEYS.some((k) => k in body);
  if ((res.status === 400 || res.status === 422) && hasOptional && /temperature|response_format|json|schema/i.test(err.message)) {
    const stripped = { ...body };
    for (const k of OPTIONAL_KEYS) delete stripped[k];
    const retry = await send(stripped);
    if (retry.ok) return retry;
    throw await errorFromResponse(retry);
  }
  throw err;
}

/** Isi message bisa string atau array part (beberapa router/proxy). */
function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((c) => (typeof c === "string" ? c : typeof c?.text === "string" ? c.text : "")).join("");
  }
  return "";
}

export const openaiAdapter: LlmAdapter = {
  async *streamText(p, req) {
    const res = await post(
      p,
      {
        model: p.model,
        stream: true,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.user },
        ],
        ...(req.temperature !== undefined ? { temperature: req.temperature } : { temperature: 0.7 }),
      },
      req.signal,
    );
    if (!res.body) throw new LlmError(502, "Respons stream kosong.");

    const filter = createThinkFilter();
    for await (const ev of readSse(res.body)) {
      if (ev.data === "[DONE]") break;
      let data;
      try {
        data = JSON.parse(ev.data);
      } catch {
        throw new LlmError(502, "Respons stream bukan JSON yang valid.");
      }
      if (data?.error) throw new LlmError(502, data.error.message ?? String(data.error));
      if (["length", "content_filter"].includes(data?.choices?.[0]?.finish_reason)) {
        throw new LlmError(422, "Terjemahan terpotong atau diblokir model. Coba model lain / potongan lebih kecil.");
      }
      const delta = contentToText(data?.choices?.[0]?.delta?.content);
      const text = delta ? filter.push(delta) : "";
      if (text) yield text;
    }
    const rest = filter.flush();
    if (rest) yield rest;
  },

  async generateJson(p, req) {
    const userContent = req.image
      ? [
          { type: "text", text: req.user },
          { type: "image_url", image_url: { url: `data:${req.image.mimeType};base64,${req.image.data}` } },
        ]
      : req.user;

    const responseFormat =
      p.jsonMode === "schema"
        ? { response_format: { type: "json_schema", json_schema: { name: req.schemaName, schema: req.schema } } }
        : p.jsonMode === "object"
          ? { response_format: { type: "json_object" } }
          : {};

    const res = await post(
      p,
      {
        model: p.model,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: userContent },
        ],
        ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
        ...responseFormat,
      },
      req.signal,
    );
    const data = await res.json();
    if (data?.error) throw new LlmError(502, data.error.message ?? String(data.error));
    const choice = data?.choices?.[0];
    const raw = stripThink(contentToText(choice?.message?.content));
    if (!raw.trim()) {
      throw new LlmError(502, `${p.meta.label} nggak ngasih jawaban (alasan: ${choice?.finish_reason ?? "unknown"}).`);
    }
    return raw;
  },

  async listModels(p, signal) {
    const res = await safeFetch(p, `${p.baseUrl}/models`, { headers: headers(p), signal });
    if (!res.ok) throw await errorFromResponse(res);
    const data = await res.json();
    const list: unknown[] = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : [];
    return list
      .map((m) => (typeof m === "string" ? m : ((m as { id?: string; name?: string })?.id ?? (m as { name?: string })?.name)))
      .filter((id): id is string => typeof id === "string" && !!id);
  },
};
