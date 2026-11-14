// Adapter Anthropic Messages API (Claude).
import "server-only";
import { errorFromResponse, LlmError, safeFetch } from "./errors.ts";
import { readSse } from "./sse.ts";
import type { LlmAdapter, ResolvedProvider } from "./types";

const MAX_TOKENS = 8192;

function headers(p: ResolvedProvider): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-api-key": p.apiKey,
    "anthropic-version": "2023-06-01",
  };
}

async function post(p: ResolvedProvider, body: Record<string, unknown>, signal?: AbortSignal): Promise<Response> {
  const res = await safeFetch(p, `${p.baseUrl}/messages`, { method: "POST", headers: headers(p), body: JSON.stringify(body), signal });
  if (!res.ok) throw await errorFromResponse(res);
  return res;
}

export const anthropicAdapter: LlmAdapter = {
  async *streamText(p, req) {
    const res = await post(
      p,
      {
        model: p.model,
        max_tokens: MAX_TOKENS,
        stream: true,
        system: req.system,
        temperature: req.temperature ?? 0.7,
        messages: [{ role: "user", content: req.user }],
      },
      req.signal,
    );
    if (!res.body) throw new LlmError(502, "Respons stream kosong.");
    for await (const ev of readSse(res.body)) {
      let data;
      try {
        data = JSON.parse(ev.data);
      } catch {
        throw new LlmError(502, "Respons stream bukan JSON yang valid.");
      }
      if (data?.type === "error") throw new LlmError(502, data.error?.message ?? "Stream error.");
      if (data?.type === "message_delta" && data.delta?.stop_reason === "max_tokens") {
        throw new LlmError(422, "Terjemahan terpotong karena batas token Claude.");
      }
      if (data?.type === "content_block_delta" && data.delta?.type === "text_delta" && data.delta.text) {
        yield data.delta.text as string;
      }
    }
  },

  async generateJson(p, req) {
    const content: unknown[] = [];
    if (req.image) {
      content.push({ type: "image", source: { type: "base64", media_type: req.image.mimeType, data: req.image.data } });
    }
    content.push({ type: "text", text: req.user });
    const res = await post(
      p,
      {
        model: p.model,
        max_tokens: MAX_TOKENS,
        system: req.system,
        ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
        messages: [{ role: "user", content }],
      },
      req.signal,
    );
    const data = await res.json();
    const raw = Array.isArray(data?.content)
      ? data.content
          .filter((c: { type?: string }) => c?.type === "text")
          .map((c: { text?: string }) => c.text ?? "")
          .join("")
      : "";
    if (!raw.trim()) throw new LlmError(502, `Claude nggak ngasih jawaban (alasan: ${data?.stop_reason ?? "unknown"}).`);
    return raw;
  },

  async listModels(p, signal) {
    const res = await safeFetch(p, `${p.baseUrl}/models?limit=100`, { headers: headers(p), signal });
    if (!res.ok) throw await errorFromResponse(res);
    const data = await res.json();
    return Array.isArray(data?.data) ? data.data.map((m: { id: string }) => m.id).filter(Boolean) : [];
  },
};
