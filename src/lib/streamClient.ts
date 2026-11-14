// Client untuk /api/translate-text: baca stream NDJSON dan panggil onEvent per event.
import type { GlossaryEntry, TextStreamEvent, TranslateSettings } from "./types";

export interface TranslateTextRequest {
  text: string;
  settings: TranslateSettings;
  glossary: GlossaryEntry[];
  previousContext?: string;
  chunkSize?: number;
}

export async function streamTranslate(
  payload: TranslateTextRequest,
  onEvent: (ev: TextStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/translate-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok || !res.body) {
    let message = `Request gagal (${res.status}).`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* bukan JSON */
    }
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) onEvent(JSON.parse(line) as TextStreamEvent);
    }
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer) as TextStreamEvent);
}
