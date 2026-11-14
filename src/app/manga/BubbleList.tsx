"use client";

import type { BubbleType, MangaBubble } from "@/lib/types";

const TYPE_LABEL: Record<BubbleType, string> = { dialog: "💬", narasi: "📜", sfx: "💥" };

/** Daftar balon di halaman aktif: edit terjemahan, ganti tipe, atau hapus. */
export function BubbleList({
  bubbles,
  selectedIndex,
  onSelect,
  onChange,
}: {
  bubbles: MangaBubble[];
  selectedIndex: number | null;
  onSelect: (i: number | null) => void;
  onChange: (bubbles: MangaBubble[]) => void;
}) {
  const update = (i: number, patch: Partial<MangaBubble>) =>
    onChange(bubbles.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));

  if (!bubbles.length) return <p className="text-sm text-zinc-500">Belum ada balon.</p>;

  return (
    <ol className="space-y-2">
      {bubbles.map((b, i) => (
        <li
          key={i}
          onClick={() => onSelect(i)}
          className={`rounded-lg border p-2 text-sm ${
            selectedIndex === i ? "border-orange-500 bg-orange-500/5" : "border-zinc-200 dark:border-zinc-800"
          }`}
        >
          <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500">
            <span>#{i + 1}</span>
            <select
              value={b.type}
              onChange={(e) => update(i, { type: e.target.value as BubbleType })}
              className="rounded border border-zinc-300 bg-transparent px-1 dark:border-zinc-700"
            >
              {(Object.keys(TYPE_LABEL) as BubbleType[]).map((t) => (
                <option key={t} value={t} className="bg-white dark:bg-zinc-900">
                  {TYPE_LABEL[t]} {t}
                </option>
              ))}
            </select>
            <span className="truncate" title={b.original}>{b.original}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(bubbles.filter((_, idx) => idx !== i));
                onSelect(null);
              }}
              className="ml-auto text-red-500 hover:underline"
            >
              hapus
            </button>
          </div>
          <textarea
            value={b.translation}
            onChange={(e) => update(i, { translation: e.target.value })}
            rows={2}
            className="w-full resize-y rounded border border-zinc-300 bg-transparent p-1.5 dark:border-zinc-700"
          />
        </li>
      ))}
    </ol>
  );
}
