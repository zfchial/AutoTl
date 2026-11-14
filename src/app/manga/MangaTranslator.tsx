"use client";

import { useState } from "react";
import { SidePanel } from "@/components/SidePanel";
import { downloadPagePng, downloadPagesZip } from "@/lib/mangaExport";
import { usePrefs } from "@/lib/usePrefs";
import { BubbleList } from "./BubbleList";
import { MangaCanvas } from "./MangaCanvas";
import { DropZone, PageStrip } from "./PageUploader";
import { btn, PageToolbar } from "./PageToolbar";
import { useMangaPages } from "./useMangaPages";

export function MangaTranslator() {
  const { settings, glossary } = usePrefs();
  const m = useMangaPages(settings, glossary);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showBoxes, setShowBoxes] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const active = m.pages.find((p) => p.id === activeId) ?? m.pages[0];
  const donePages = m.pages.filter((p) => p.status === "done");
  const pendingCount = m.pages.filter((p) => p.status !== "done").length;

  const selectPage = (id: string | null) => {
    setActiveId(id);
    setSelected(null);
  };

  const runExport = async (fn: () => Promise<void>) => {
    setExporting(true);
    setExportError("");
    try {
      await fn();
    } catch (err) {
      setExportError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[300px_1fr]">
      <SidePanel>
        {active && (
          <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="mb-3 font-semibold">💬 Balon halaman ini ({active.bubbles.length})</h2>
            <div className="max-h-[50vh] overflow-auto">
              <BubbleList
                bubbles={active.bubbles}
                selectedIndex={selected}
                onSelect={setSelected}
                onChange={(b) => m.updateBubbles(active.id, b)}
              />
            </div>
          </section>
        )}
      </SidePanel>

      <main className="min-w-0 space-y-4">
        <h1 className="text-2xl font-bold">🖼️ Manga / Manhwa</h1>
        <DropZone onFiles={(files) => void m.addFiles(files)} />
        {m.notice && <p className="text-sm text-amber-600">{m.notice}</p>}
        {exportError && <p className="text-sm text-red-500">{exportError}</p>}

        {m.pages.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {m.busy ? (
                <button type="button" onClick={m.stop} className="rounded-lg bg-red-500 px-4 py-2 font-medium text-white hover:bg-red-600">
                  ⏹ Stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void m.translatePending()}
                  disabled={!pendingCount}
                  className="rounded-lg bg-orange-500 px-4 py-2 font-medium text-white hover:bg-orange-600 disabled:opacity-40"
                >
                  ✨ Terjemahin semua ({pendingCount})
                </button>
              )}
              <button type="button" disabled={!donePages.length || exporting} onClick={() => runExport(() => downloadPagesZip(donePages))} className={btn}>
                {exporting ? "Menyiapkan…" : `⬇ ZIP (${donePages.length})`}
              </button>
              <button
                type="button"
                disabled={m.busy}
                onClick={() => {
                  m.clearAll();
                  selectPage(null);
                }}
                className={`${btn} ml-auto text-red-500`}
              >
                🗑 Hapus semua
              </button>
            </div>
            <PageStrip pages={m.pages} activeId={active?.id} onSelect={selectPage} />
          </>
        )}

        {active && (
          <section className="space-y-3">
            <PageToolbar
              page={active}
              busy={m.busy}
              exporting={exporting}
              showOriginal={showOriginal}
              showBoxes={showBoxes}
              onShowOriginal={setShowOriginal}
              onShowBoxes={setShowBoxes}
              onRetranslate={() => m.retranslate(active.id)}
              onDownload={() => runExport(() => downloadPagePng(active))}
              onRemove={() => {
                m.removePage(active.id);
                selectPage(null);
              }}
            />
            {active.status === "running" && <p className="text-sm text-orange-500">✍️ Lagi baca &amp; nerjemahin halaman ini…</p>}
            {active.error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{active.error}</p>}
            <MangaCanvas
              src={active.dataUrl}
              bubbles={active.bubbles}
              showOriginal={showOriginal}
              showBoxes={showBoxes}
              selectedIndex={selected}
              onSelect={setSelected}
            />
          </section>
        )}
      </main>
    </div>
  );
}
