// Error seragam untuk semua provider + retry + pesan ramah buat user.
import { ApiError } from "@google/genai";
import { setTimeout as sleep } from "node:timers/promises";
import type { ResolvedProvider } from "./types";

export class LlmError extends Error {
  /** HTTP status dari provider. 0 = gagal konek / bukan error HTTP. */
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "LlmError";
    this.status = status;
  }
}

function statusOf(err: unknown): number | null {
  if (err instanceof LlmError) return err.status;
  if (err instanceof ApiError) return err.status;
  return null;
}

function isRetryable(err: unknown): boolean {
  const status = statusOf(err);
  return status !== null && (status === 429 || status >= 500);
}

/** Jalankan fn dengan retry exponential backoff untuk error 429/5xx. */
export async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 4, signal?: AbortSignal): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    signal?.throwIfAborted();
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (signal?.aborted || !isRetryable(err) || attempt === maxAttempts) break;
      await sleep(Math.min(2000 * 2 ** (attempt - 1), 20000), undefined, { signal });
    }
  }
  throw lastErr;
}

/** Ambil pesan error dari body respons (format OpenAI/Anthropic/9Router umumnya { error: { message } }). */
export async function errorFromResponse(res: Response): Promise<LlmError> {
  const raw = await res.text().catch(() => "");
  let message = raw.slice(0, 500) || res.statusText;
  try {
    const data = JSON.parse(raw);
    const e = data?.error;
    message = (typeof e === "string" ? e : e?.message) ?? data?.message ?? data?.detail ?? message;
  } catch {
    /* bukan JSON */
  }
  return new LlmError(res.status, String(message));
}

/** fetch yang mengubah error jaringan jadi LlmError(0) dengan pesan jelas. */
export async function safeFetch(p: ResolvedProvider, url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    if (init.signal?.aborted) throw err;
    const where = p.meta.local ? ` Pastikan ${p.meta.label} sudah jalan.` : "";
    throw new LlmError(0, `Nggak bisa nyambung ke ${p.meta.label} (${p.baseUrl}).${where}`);
  }
}

/** Ubah error provider jadi pesan yang ramah buat user. */
export function friendlyError(err: unknown, p?: ResolvedProvider): string {
  const name = p?.meta.label ?? "provider AI";
  const status = statusOf(err);
  const detail = err instanceof Error ? err.message : String(err);
  if (status === null || status === 0) return detail;
  if (status === 429) return `Kena limit kuota ${name} (429). Tunggu sebentar lalu coba lagi.`;
  if (status === 401 || status === 403) {
    return `API key ${name} nggak valid atau nggak punya akses ke model ini (${status}). ${p ? `Cek ${p.meta.envPrefix}_API_KEY di .env.local.` : ""}`.trim();
  }
  if (status === 404) return `Model "${p?.model ?? "?"}" atau endpoint nggak ditemukan di ${name} (404): ${detail}`;
  if (status === 400 || status === 422) return `Request ditolak ${name} (${status}): ${detail}`;
  return `Error ${name} (${status}): ${detail}`;
}
