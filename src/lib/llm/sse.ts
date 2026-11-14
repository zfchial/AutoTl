// Parser Server-Sent Events minimal (dipakai adapter OpenAI-compatible & Anthropic).
// Tanpa dependency supaya bisa dites langsung pakai `node --test`.

export interface SseEvent {
  event?: string;
  data: string;
}

/** Baca body SSE dan hasilkan satu event per blok (dipisah baris kosong). */
export async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let event: string | undefined;
  let data: string[] = [];

  const dispatch = (): SseEvent | null => {
    const ev = data.length ? { event, data: data.join("\n") } : null;
    event = undefined;
    data = [];
    return ev;
  };

  const handleLine = (line: string): SseEvent | null => {
    if (line === "") return dispatch();
    if (line.startsWith(":")) return null; // komentar / keep-alive
    const colon = line.indexOf(":");
    const field = colon >= 0 ? line.slice(0, colon) : line;
    let value = colon >= 0 ? line.slice(colon + 1) : "";
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "data") data.push(value);
    else if (field === "event") event = value;
    return null;
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).replace(/\r$/, "");
        buffer = buffer.slice(nl + 1);
        const ev = handleLine(line);
        if (ev) yield ev;
      }
    }
    buffer += decoder.decode();
    if (buffer) {
      const ev = handleLine(buffer.replace(/\r$/, ""));
      if (ev) yield ev;
    }
    const last = dispatch();
    if (last) yield last;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
