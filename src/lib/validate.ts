// Validasi ringan untuk body request dari client.
import { DEFAULT_SETTINGS, type GlossaryEntry, type SourceLang, type Tone, type TranslateSettings } from "./types.ts";
import { isProviderId } from "./providers.ts";

const TONES: Tone[] = ["santai", "gaul", "semiformal"];
const LANGS: SourceLang[] = ["auto", "ja", "ko", "zh", "en"];

export function parseSettings(input: unknown): TranslateSettings {
  const s = (input && typeof input === "object" ? input : {}) as Partial<TranslateSettings>;
  return {
    provider: isProviderId(s.provider) ? s.provider : "",
    model: typeof s.model === "string" ? s.model.trim().slice(0, 200) : "",
    tone: TONES.includes(s.tone as Tone) ? (s.tone as Tone) : DEFAULT_SETTINGS.tone,
    keepHonorifics: typeof s.keepHonorifics === "boolean" ? s.keepHonorifics : DEFAULT_SETTINGS.keepHonorifics,
    sourceLang: LANGS.includes(s.sourceLang as SourceLang) ? (s.sourceLang as SourceLang) : DEFAULT_SETTINGS.sourceLang,
  };
}

export function parseGlossary(input: unknown): GlossaryEntry[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((g): g is GlossaryEntry => !!g && typeof g === "object" && typeof g.source === "string" && typeof g.target === "string")
    .slice(0, 300)
    .map((g) => ({
      source: g.source.slice(0, 200),
      target: g.target.slice(0, 200),
      note: typeof g.note === "string" ? g.note.slice(0, 200) : undefined,
    }));
}
