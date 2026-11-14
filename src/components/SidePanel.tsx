"use client";

import { usePrefs } from "@/lib/usePrefs";
import { GlossaryEditor } from "./GlossaryEditor";
import { SettingsPanel } from "./SettingsPanel";

/** Panel kiri: pengaturan gaya + glosarium (dipakai di halaman LN & manga). */
export function SidePanel({ children }: { children?: React.ReactNode }) {
  const { settings, setSettings, glossary, setGlossary } = usePrefs();
  return (
    <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
      {children}
      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-3 font-semibold">⚙️ Pengaturan</h2>
        <SettingsPanel settings={settings} onChange={setSettings} />
      </section>
      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-3 font-semibold">📖 Glosarium ({glossary.length})</h2>
        <GlossaryEditor glossary={glossary} onChange={setGlossary} />
      </section>
    </aside>
  );
}
