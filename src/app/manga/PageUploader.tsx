"use client";

import { useRef, useState } from "react";
import type { MangaPage, PageStatus } from "./useMangaPages";

const STATUS_ICON: Record<PageStatus, string> = { idle: "⏳", running: "✍️", done: "✅", error: "⚠️" };

/** Area drag & drop untuk upload halaman manga. */
export function DropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
      onClick={() => fileRef.current?.click()}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center text-sm transition ${
        dragOver ? "border-orange-500 bg-orange-500/5" : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700"
      }`}
    >
      📥 Drag &amp; drop halaman manga di sini, atau klik buat pilih (PNG/JPG/WEBP, maks 10MB, bisa banyak)
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** Strip thumbnail halaman beserta status terjemahannya. */
export function PageStrip({
  pages,
  activeId,
  onSelect,
}: {
  pages: MangaPage[];
  activeId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {pages.map((p, i) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelect(p.id)}
          title={p.error ?? p.name}
          className={`relative shrink-0 overflow-hidden rounded-lg border-2 ${
            activeId === p.id ? "border-orange-500" : "border-transparent"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.dataUrl} alt={p.name} className="h-24 w-auto object-cover" />
          <span className="absolute left-1 top-1 rounded bg-black/70 px-1 text-xs text-white">
            {i + 1} {STATUS_ICON[p.status]}
          </span>
        </button>
      ))}
    </div>
  );
}
