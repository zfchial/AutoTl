"use client";

import type { SourceLang, Tone, TranslateSettings } from "@/lib/types";
import { ProviderSettings } from "./ProviderSettings";

const TONES: { value: Tone; label: string; hint: string }[] = [
  { value: "santai", label: "Santai", hint: "aku/kamu, nggak, udah" },
  { value: "gaul", label: "Gaul", hint: "gue/lo, anjir, banget" },
  { value: "semiformal", label: "Semi-formal", hint: "luwes, narasi rapi" },
];

const LANGS: { value: SourceLang; label: string }[] = [
  { value: "auto", label: "Deteksi otomatis" },
  { value: "ja", label: "Jepang" },
  { value: "ko", label: "Korea" },
  { value: "zh", label: "Mandarin" },
  { value: "en", label: "Inggris" },
];

export function SettingsPanel({
  settings,
  onChange,
}: {
  settings: TranslateSettings;
  onChange: (s: TranslateSettings) => void;
}) {
  return (
    <div className="space-y-4">
      <ProviderSettings settings={settings} onChange={onChange} />
      <div>
        <p className="mb-2 text-sm font-semibold">Gaya bahasa</p>
        <div className="grid grid-cols-3 gap-2">
          {TONES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange({ ...settings, tone: t.value })}
              className={`rounded-lg border px-2 py-2 text-left text-sm transition ${
                settings.tone === t.value
                  ? "border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                  : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
              }`}
            >
              <span className="block font-medium">{t.label}</span>
              <span className="block text-xs opacity-70">{t.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-semibold">Bahasa sumber</span>
        <select
          value={settings.sourceLang}
          onChange={(e) => onChange({ ...settings, sourceLang: e.target.value as SourceLang })}
          className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        >
          {LANGS.map((l) => (
            <option key={l.value} value={l.value} className="bg-white dark:bg-zinc-900">
              {l.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={settings.keepHonorifics}
          onChange={(e) => onChange({ ...settings, keepHonorifics: e.target.checked })}
          className="h-4 w-4 accent-orange-500"
        />
        Pertahankan honorifik (-san, -kun, senpai, oppa…)
      </label>
    </div>
  );
}
