"use client";

import { useLocalStorage } from "./useLocalStorage";
import { DEFAULT_SETTINGS, type GlossaryEntry, type TranslateSettings } from "./types";

const EMPTY_GLOSSARY: GlossaryEntry[] = [];

/** Settings + glosarium global, disimpan di localStorage dan dipakai bareng halaman LN & manga. */
export function usePrefs() {
  const [settings, setSettings] = useLocalStorage<TranslateSettings>("autotl:settings", DEFAULT_SETTINGS);
  const [glossary, setGlossary] = useLocalStorage<GlossaryEntry[]>("autotl:glossary", EMPTY_GLOSSARY);
  return { settings: { ...DEFAULT_SETTINGS, ...settings }, setSettings, glossary, setGlossary };
}
