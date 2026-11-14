// Memecah teks panjang jadi potongan-potongan berdasarkan paragraf,
// supaya tiap request ke Gemini nggak kepanjangan dan hasilnya bisa di-stream per potongan.
// File ini sengaja tanpa dependency supaya bisa dites langsung pakai `node --test`.

export const DEFAULT_CHUNK_SIZE = 3000;

/** Normalisasi line ending dan buang spasi berlebih di ujung. */
export function normalizeText(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
}

/** Pecah satu paragraf yang terlalu panjang berdasarkan akhir kalimat. */
function splitLongParagraph(paragraph: string, maxChars: number): string[] {
  // Akhir kalimat: tanda baca Latin, Jepang/Cina, dan penutup kutip setelahnya.
  const sentences =
    paragraph.match(/[^.!?。！？…]+(?:[.!?。！？…]+[」』”"')\]]*|$)/g) ?? [paragraph];

  const parts: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (!sentence) continue;
    if (current && current.length + sentence.length > maxChars) {
      parts.push(current.trim());
      current = "";
    }
    if (sentence.length > maxChars) {
      // Kalimat super panjang: potong paksa, usahakan di spasi supaya kata nggak kebelah.
      if (current.trim()) parts.push(current.trim());
      current = "";
      let rest = sentence;
      while (rest.length > maxChars) {
        const space = rest.lastIndexOf(" ", maxChars);
        const cut = space > maxChars * 0.5 ? space : maxChars;
        parts.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trimStart();
      }
      current = rest;
      continue;
    }
    current += sentence;
  }
  if (current.trim()) parts.push(current.trim());
  return parts.filter(Boolean);
}

/**
 * Pecah teks jadi potongan maksimal `maxChars` karakter.
 * Paragraf (dipisah baris baru) diusahakan nggak terpotong di tengah.
 */
export function splitIntoChunks(text: string, maxChars: number = DEFAULT_CHUNK_SIZE): string[] {
  const clean = normalizeText(text);
  if (!clean) return [];

  const paragraphs = clean.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current: string[] = [];
  let currentLen = 0;

  const flush = () => {
    if (current.length) {
      chunks.push(current.join("\n\n"));
      current = [];
      currentLen = 0;
    }
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      flush();
      chunks.push(...splitLongParagraph(paragraph, maxChars));
      continue;
    }
    const addedLen = paragraph.length + (current.length ? 2 : 0);
    if (currentLen + addedLen > maxChars) flush();
    current.push(paragraph);
    currentLen += paragraph.length + (current.length > 1 ? 2 : 0);
  }
  flush();
  return chunks;
}
