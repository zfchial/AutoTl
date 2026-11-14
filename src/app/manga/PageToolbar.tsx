"use client";

import type { MangaPage } from "./useMangaPages";

export const btn =
  "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800";

/** Toolbar untuk halaman aktif: toggle tampilan, ulang, unduh PNG, hapus. */
export function PageToolbar({
  page,
  busy,
  exporting,
  showOriginal,
  showBoxes,
  onShowOriginal,
  onShowBoxes,
  onRetranslate,
  onDownload,
  onRemove,
}: {
  page: MangaPage;
  busy: boolean;
  exporting: boolean;
  showOriginal: boolean;
  showBoxes: boolean;
  onShowOriginal: (v: boolean) => void;
  onShowBoxes: (v: boolean) => void;
  onRetranslate: () => void;
  onDownload: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <b className="truncate">{page.name}</b>
      <label className="flex items-center gap-1">
        <input type="checkbox" checked={showOriginal} onChange={(e) => onShowOriginal(e.target.checked)} className="accent-orange-500" />
        Lihat asli
      </label>
      <label className="flex items-center gap-1">
        <input type="checkbox" checked={showBoxes} onChange={(e) => onShowBoxes(e.target.checked)} className="accent-orange-500" />
        Tampilkan kotak
      </label>
      <div className="ml-auto flex gap-2">
        <button type="button" disabled={busy} onClick={onRetranslate} className={btn}>
          🔄 Ulang
        </button>
        <button type="button" disabled={page.status !== "done" || exporting} onClick={onDownload} className={btn}>
          ⬇ PNG
        </button>
        <button type="button" disabled={busy} onClick={onRemove} className={`${btn} text-red-500`} aria-label="Hapus halaman ini">
          ✕
        </button>
      </div>
    </div>
  );
}
