"use client";

import { useState } from "react";
import { SidePanel } from "@/components/SidePanel";
import { downloadText, safeFilename } from "@/lib/download";
import { usePrefs } from "@/lib/usePrefs";
import { ChunkRow } from "./ChunkRow";
import { SourceInput } from "./SourceInput";
import { useNovelTranslation } from "./useNovelTranslation";

const btn = "rounded-lg border border-zinc-300 px-3 py-1 text-sm disabled:opacity-40 dark:border-zinc-700";

export function NovelTranslator() {
  const { settings, glossary } = usePrefs();
  const [text, setText] = useState("");
  const [title, setTitle] = useState("terjemahan");
  const [showSource, setShowSource] = useState(true);
  const [copied, setCopied] = useState(false);
  const tl = useNovelTranslation(settings, glossary);

  const copy = async () => {
    await navigator.clipboard.writeText(tl.fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[300px_1fr]">
      <SidePanel />

      <main className="min-w-0 space-y-6">
        <section className="space-y-3">
          <h1 className="text-2xl font-bold">📚 Light Novel</h1>
          <SourceInput text={text} onTextChange={setText} onTitleChange={setTitle} />
          {tl.busy ? (
            <button type="button" onClick={tl.stop} className="rounded-lg bg-red-500 px-4 py-2 font-medium text-white hover:bg-red-600">
              ⏹ Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => tl.translateAll(text)}
              disabled={!text.trim()}
              className="rounded-lg bg-orange-500 px-4 py-2 font-medium text-white hover:bg-orange-600 disabled:opacity-40"
            >
              ✨ Terjemahin
            </button>
          )}
          {tl.error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{tl.error}</p>}
        </section>

        {tl.chunks.length > 0 && (
          <section>
            <div className="sticky top-14 z-10 flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white/90 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
              <span className="text-sm text-zinc-500">
                {tl.doneCount}/{tl.chunks.length} bagian
              </span>
              <div className="h-1.5 w-32 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
                <div className="h-full bg-orange-500 transition-all" style={{ width: `${(tl.doneCount / tl.chunks.length) * 100}%` }} />
              </div>
              <label className="ml-auto flex items-center gap-1 text-sm">
                <input type="checkbox" checked={showSource} onChange={(e) => setShowSource(e.target.checked)} className="accent-orange-500" />
                Teks asli
              </label>
              <button type="button" onClick={copy} disabled={!tl.fullText} className={btn}>
                {copied ? "✔ Tersalin" : "📋 Salin"}
              </button>
              <button type="button" onClick={() => downloadText(tl.fullText, `${safeFilename(title)}.txt`)} disabled={!tl.fullText} className={btn}>
                ⬇ .txt
              </button>
              <button type="button" onClick={() => downloadText(`# ${title}\n\n${tl.fullText}\n`, `${safeFilename(title)}.md`)} disabled={!tl.fullText} className={btn}>
                ⬇ .md
              </button>
            </div>
            <p className="mt-2 text-xs text-zinc-500">Tips: klik terjemahan yang sudah beres buat ngedit manual.</p>
            {tl.chunks.map((c, i) => (
              <ChunkRow
                key={i}
                index={i}
                chunk={c}
                showSource={showSource}
                busy={tl.busy}
                onRetry={tl.retryChunk}
                onEdit={tl.editChunk}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
