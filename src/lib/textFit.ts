// Algoritma word-wrap + auto-fit ukuran font untuk balon manga.
// Murni (tanpa DOM): fungsi pengukur lebar teks di-inject, jadi bisa dites di Node.

export type MeasureFn = (text: string, fontSize: number) => number;

/** Bungkus teks ke beberapa baris sesuai lebar maksimum. Kata super panjang dipotong + diberi "-". */
export function wrapText(text: string, maxWidth: number, fontSize: number, measure: MeasureFn): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (let word of words) {
      // Pecah kata yang lebih lebar dari kotak.
      while (measure(word, fontSize) > maxWidth && word.length > 1) {
        let cut = word.length - 1;
        while (cut > 1 && measure(word.slice(0, cut) + "-", fontSize) > maxWidth) cut--;
        if (line) {
          lines.push(line);
          line = "";
        }
        lines.push(word.slice(0, cut) + "-");
        word = word.slice(cut);
      }
      const candidate = line ? `${line} ${word}` : word;
      if (line && measure(candidate, fontSize) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export interface FitResult {
  fontSize: number;
  lines: string[];
  lineHeight: number;
}

/** Cari ukuran font terbesar yang bikin teks muat di kotak (binary search). */
export function fitText(
  text: string,
  boxWidth: number,
  boxHeight: number,
  measure: MeasureFn,
  opts: { minSize?: number; maxSize?: number; lineHeightRatio?: number } = {},
): FitResult {
  const minSize = opts.minSize ?? 8;
  const maxSize = Math.max(minSize, opts.maxSize ?? 48);
  const ratio = opts.lineHeightRatio ?? 1.2;

  const fits = (size: number) => {
    const lines = wrapText(text, boxWidth, size, measure);
    const height = lines.length * size * ratio;
    const widest = Math.max(0, ...lines.map((l) => measure(l, size)));
    return { ok: height <= boxHeight && widest <= boxWidth, lines };
  };

  let lo = minSize;
  let hi = maxSize;
  let best = { fontSize: minSize, lines: wrapText(text, boxWidth, minSize, measure) };
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const r = fits(mid);
    if (r.ok) {
      best = { fontSize: mid, lines: r.lines };
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return { ...best, lineHeight: best.fontSize * ratio };
}
