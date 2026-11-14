// Tipe internal lapisan LLM (server).
import type { JsonMode, ProviderMeta } from "../providers";

/** Provider yang sudah di-resolve dengan config dari env. */
export interface ResolvedProvider {
  meta: ProviderMeta;
  apiKey: string;
  baseUrl: string;
  model: string;
  jsonMode: JsonMode;
}

export interface InlineImage {
  mimeType: string;
  /** base64 tanpa prefix data: */
  data: string;
}

export interface TextRequest {
  system: string;
  user: string;
  temperature?: number;
  signal?: AbortSignal;
}

export interface JsonRequest extends TextRequest {
  image?: InlineImage;
  /** JSON schema output (dipakai kalau provider mendukung structured output). */
  schema: Record<string, unknown>;
  schemaName: string;
}

export interface LlmAdapter {
  /** Stream teks terjemahan (delta demi delta). */
  streamText(p: ResolvedProvider, req: TextRequest): AsyncGenerator<string>;
  /** Satu request non-stream yang diharapkan mengembalikan JSON (mentah, belum di-parse). */
  generateJson(p: ResolvedProvider, req: JsonRequest): Promise<string>;
  /** Daftar ID model yang tersedia. */
  listModels(p: ResolvedProvider, signal?: AbortSignal): Promise<string[]>;
}
