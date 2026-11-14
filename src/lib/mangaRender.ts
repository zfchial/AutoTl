// Render halaman manga hasil terjemahan ke canvas (client only).
import { fitText } from "./textFit";
import type { MangaBubble } from "./types";

export const MANGA_FONT = '"Comic Neue", "Comic Sans MS", "Segoe UI", Arial, sans-serif';

export interface RenderOptions {
  /** Padding kotak (piksel) yang ikut ditutup supaya teks asli hilang total. */
  padding?: number;
  /** Tutup balon pakai warna latar yang disampling dari pinggir kotak. */
  sampleBackground?: boolean;
  showBoxes?: boolean;
  selectedIndex?: number | null;
}

export function boxToPixels(box: MangaBubble["box"], width: number, height: number, padding = 0) {
  const [ymin, xmin, ymax, xmax] = box;
  const x = Math.max(0, (xmin / 1000) * width - padding);
  const y = Math.max(0, (ymin / 1000) * height - padding);
  const x2 = Math.min(width, (xmax / 1000) * width + padding);
  const y2 = Math.min(height, (ymax / 1000) * height + padding);
  return { x, y, w: x2 - x, h: y2 - y };
}

/** Ambil warna dominan (rata-rata terang) dari pinggir kotak; default putih. */
function sampleEdgeColor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): string {
  try {
    const sx = Math.floor(x);
    const sy = Math.floor(y);
    const sw = Math.max(1, Math.floor(w));
    const sh = Math.max(1, Math.floor(h));
    const data = ctx.getImageData(sx, sy, sw, sh).data;
    let r = 0, g = 0, b = 0, n = 0;
    const take = (px: number, py: number) => {
      const i = (py * sw + px) * 4;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    };
    for (let px = 0; px < sw; px += 2) { take(px, 0); take(px, sh - 1); }
    for (let py = 0; py < sh; py += 2) { take(0, py); take(sw - 1, py); }
    if (!n) return "#ffffff";
    return `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
  } catch {
    return "#ffffff";
  }
}

function isDark(color: string): boolean {
  const m = color.match(/\d+/g);
  if (!m) return false;
  const [r, g, b] = m.map(Number);
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function renderManga(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement | ImageBitmap,
  bubbles: MangaBubble[],
  opts: RenderOptions = {},
) {
  const width = image.width;
  const height = image.height;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;

  ctx.drawImage(image, 0, 0);
  const padding = opts.padding ?? Math.round(Math.min(width, height) * 0.006);
  const measure = (text: string, size: number) => {
    ctx.font = `bold ${size}px ${MANGA_FONT}`;
    return ctx.measureText(text).width;
  };

  bubbles.forEach((bubble, index) => {
    const { x, y, w, h } = boxToPixels(bubble.box, width, height, padding);
    if (w < 4 || h < 4) return;

    const bg = opts.sampleBackground === false ? "#ffffff" : sampleEdgeColor(ctx, x, y, w, h);
    const dark = isDark(bg);

    if (bubble.type !== "sfx") {
      ctx.fillStyle = bg;
      roundRect(ctx, x, y, w, h, Math.min(w, h) * 0.2);
      ctx.fill();
    }

    const inner = Math.max(2, Math.min(w, h) * 0.06);
    const maxSize = Math.max(10, Math.round(Math.min(height * 0.05, h * 0.6)));
    const fit = fitText(bubble.translation, w - inner * 2, h - inner * 2, measure, { minSize: 8, maxSize });

    ctx.font = `bold ${fit.fontSize}px ${MANGA_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const totalH = fit.lines.length * fit.lineHeight;
    const startY = y + h / 2 - totalH / 2 + fit.lineHeight / 2;

    fit.lines.forEach((line, i) => {
      const ly = startY + i * fit.lineHeight;
      if (bubble.type === "sfx") {
        // SFX: teks dengan outline supaya kebaca di atas gambar.
        ctx.lineWidth = Math.max(2, fit.fontSize * 0.18);
        ctx.strokeStyle = "#ffffff";
        ctx.lineJoin = "round";
        ctx.strokeText(line, x + w / 2, ly);
        ctx.fillStyle = "#111111";
      } else {
        ctx.fillStyle = dark ? "#ffffff" : "#111111";
      }
      ctx.fillText(line, x + w / 2, ly);
    });

    if (opts.showBoxes || opts.selectedIndex === index) {
      ctx.lineWidth = Math.max(2, width * 0.002);
      ctx.strokeStyle = opts.selectedIndex === index ? "#f97316" : "rgba(59,130,246,0.8)";
      ctx.strokeRect(x, y, w, h);
    }
  });
}

/** Cari indeks balon di posisi klik (koordinat piksel canvas). Balon terkecil diprioritaskan. */
export function hitTest(bubbles: MangaBubble[], px: number, py: number, width: number, height: number): number | null {
  let found: number | null = null;
  let foundArea = Infinity;
  bubbles.forEach((b, i) => {
    const { x, y, w, h } = boxToPixels(b.box, width, height);
    if (px >= x && px <= x + w && py >= y && py <= y + h && w * h < foundArea) {
      found = i;
      foundArea = w * h;
    }
  });
  return found;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar."));
    img.src = src;
  });
}

/** Baca File jadi base64 (tanpa prefix) + dataURL. */
export function fileToBase64(file: File): Promise<{ base64: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      resolve({ dataUrl, base64: dataUrl.slice(dataUrl.indexOf(",") + 1) });
    };
    reader.onerror = () => reject(reader.error ?? new Error("Gagal membaca file."));
    reader.readAsDataURL(file);
  });
}
