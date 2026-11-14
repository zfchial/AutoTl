// Buang blok <think>...</think> dari output model reasoning (DeepSeek-R1, Qwen3, dll via 9Router/Ollama).
// Bekerja secara streaming: tag yang terpotong di antara dua delta tetap terdeteksi.
// Tanpa dependency supaya bisa dites langsung pakai `node --test`.

const OPEN = "<think>";
const CLOSE = "</think>";

/** Panjang akhiran `text` yang merupakan awalan dari `tag` (buat nahan tag yang kepotong). */
function partialSuffix(text: string, tag: string): number {
  for (let n = Math.min(tag.length - 1, text.length); n > 0; n--) {
    if (text.endsWith(tag.slice(0, n))) return n;
  }
  return 0;
}

export function createThinkFilter() {
  let buffer = "";
  let inThink = false;
  /** Setelah ada teks biasa yang keluar, whitespace awal nggak perlu dibuang lagi. */
  let started = false;

  const emit = (text: string) => {
    if (!started) {
      text = text.replace(/^\s+/, "");
      if (text) started = true;
    }
    return text;
  };

  return {
    push(chunk: string): string {
      buffer += chunk;
      let out = "";
      while (buffer) {
        if (inThink) {
          const end = buffer.indexOf(CLOSE);
          if (end < 0) {
            buffer = buffer.slice(buffer.length - partialSuffix(buffer, CLOSE));
            break;
          }
          buffer = buffer.slice(end + CLOSE.length);
          inThink = false;
          continue;
        }
        const start = buffer.indexOf(OPEN);
        if (start < 0) {
          const keep = partialSuffix(buffer, OPEN);
          out += emit(buffer.slice(0, buffer.length - keep));
          buffer = buffer.slice(buffer.length - keep);
          break;
        }
        out += emit(buffer.slice(0, start));
        buffer = buffer.slice(start + OPEN.length);
        inThink = true;
      }
      return out;
    },
    /** Keluarkan sisa buffer di akhir stream. */
    flush(): string {
      const rest = inThink ? "" : emit(buffer);
      buffer = "";
      return rest;
    },
  };
}

/** Versi non-streaming. */
export function stripThink(text: string): string {
  const f = createThinkFilter();
  return f.push(text) + f.flush();
}
