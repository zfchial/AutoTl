// Pintu masuk lapisan LLM multi-provider (server-only).
import "server-only";
import type { ProviderKind } from "../providers";
import { anthropicAdapter } from "./anthropic.ts";
import { withRetry } from "./errors.ts";
import { geminiAdapter } from "./gemini.ts";
import { openaiAdapter } from "./openai.ts";
import type { JsonRequest, LlmAdapter, ResolvedProvider, TextRequest } from "./types";

export { listProviders, resolveProvider } from "./config.ts";
export { friendlyError } from "./errors.ts";
export type { ResolvedProvider } from "./types";

const ADAPTERS: Record<ProviderKind, LlmAdapter> = {
  gemini: geminiAdapter,
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
};

const adapterOf = (p: ResolvedProvider) => ADAPTERS[p.meta.kind];

/**
 * Stream teks. Retry (429/5xx) hanya saat membuka stream; delta pertama ditarik di dalam retry
 * supaya error HTTP di awal tetap kena retry. Kalau gagal di tengah, error dilempar ke pemanggil.
 */
export async function* streamText(p: ResolvedProvider, req: TextRequest): AsyncGenerator<string> {
  const { iterator, first } = await withRetry(
    async () => {
      const iterator = adapterOf(p).streamText(p, req);
      const first = await iterator.next();
      return { iterator, first };
    },
    4,
    req.signal,
  );
  try {
    if (first.done) return;
    yield first.value;
    yield* iterator;
  } finally {
    await iterator.return(undefined);
  }
}

/** Satu request JSON (dengan retry). Hasilnya teks mentah, parse di pemanggil. */
export function generateJson(p: ResolvedProvider, req: JsonRequest): Promise<string> {
  // Sertakan schema juga saat response_format harus dihapus oleh fallback kompatibilitas.
  const user = `${req.user}\n\nBalas HANYA dengan JSON valid (tanpa markdown, tanpa penjelasan) yang sesuai JSON schema ini:\n${JSON.stringify(req.schema)}`;
  return withRetry(() => adapterOf(p).generateJson(p, { ...req, user }), 4, req.signal);
}

export function listModels(p: ResolvedProvider, signal?: AbortSignal): Promise<string[]> {
  return adapterOf(p).listModels(p, signal);
}
