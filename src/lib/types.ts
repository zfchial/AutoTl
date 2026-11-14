// Tipe data yang dipakai bareng oleh client dan server.
import type { ProviderId } from "./providers";

export type Tone = "santai" | "gaul" | "semiformal";
export type SourceLang = "auto" | "ja" | "ko" | "zh" | "en";

export interface TranslateSettings {
  /** Kosong = default server. API key dan URL tetap hanya di server. */
  provider: ProviderId | "";
  model: string;
  tone: Tone;
  keepHonorifics: boolean;
  sourceLang: SourceLang;
}

export interface GlossaryEntry {
  source: string;
  target: string;
  note?: string;
}

export type BubbleType = "dialog" | "narasi" | "sfx";

export interface MangaBubble {
  /** [ymin, xmin, ymax, xmax] dalam skala 0-1000 (format box_2d Gemini) */
  box: [number, number, number, number];
  original: string;
  translation: string;
  type: BubbleType;
}

/** Event NDJSON yang dikirim oleh /api/translate-text */
export type TextStreamEvent =
  | { type: "meta"; total: number; chunks: string[] }
  | { type: "delta"; index: number; text: string }
  | { type: "done"; index: number }
  | { type: "error"; index?: number; message: string }
  | { type: "end" };

export const DEFAULT_SETTINGS: TranslateSettings = {
  provider: "",
  model: "",
  tone: "santai",
  keepHonorifics: true,
  sourceLang: "auto",
};
