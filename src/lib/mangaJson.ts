// Parser + validator untuk JSON hasil deteksi balon dari Gemini.
// Tanpa dependency supaya bisa dites langsung pakai `node --test`.

import type { BubbleType, MangaBubble } from "./types";

const VALID_TYPES: BubbleType[] = ["dialog", "narasi", "sfx"];

function clamp(n: number): number {
  return Math.min(1000, Math.max(0, n));
}

/** Ambil isi JSON walaupun model membungkusnya dengan ```json ... ``` */
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : raw).trim();
}

/**
 * Ubah output mentah Gemini jadi daftar MangaBubble yang valid.
 * Menerima bentuk `{ bubbles: [...] }` maupun array langsung.
 * Item yang rusak dibuang, koordinat di-clamp ke 0-1000, dan urutan min/max dibetulkan.
 */
export function parseBubbles(raw: string): MangaBubble[] {
  let data: unknown;
  try {
    data = JSON.parse(extractJson(raw));
  } catch {
    throw new Error("Respons model bukan JSON yang valid.");
  }

  const list: unknown[] = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { bubbles?: unknown }).bubbles)
      ? (data as { bubbles: unknown[] }).bubbles
      : [];

  const result: MangaBubble[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const box = obj.box_2d ?? obj.box;
    if (!Array.isArray(box) || box.length !== 4) continue;
    const nums = box.map((v) => Number(v));
    if (nums.some((v) => !Number.isFinite(v))) continue;

    const [y0, x0, y1, x1] = nums.map(clamp);
    const ymin = Math.min(y0, y1);
    const ymax = Math.max(y0, y1);
    const xmin = Math.min(x0, x1);
    const xmax = Math.max(x0, x1);
    if (ymax - ymin < 2 || xmax - xmin < 2) continue;

    const translation = typeof obj.translation === "string" ? obj.translation.trim() : "";
    if (!translation) continue;

    const type = VALID_TYPES.includes(obj.type as BubbleType) ? (obj.type as BubbleType) : "dialog";

    result.push({
      box: [ymin, xmin, ymax, xmax],
      original: typeof obj.original === "string" ? obj.original.trim() : "",
      translation,
      type,
    });
  }
  return result;
}
