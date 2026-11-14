"use client";

import { useState } from "react";
import type { GlossaryEntry } from "@/lib/types";

export function GlossaryEditor({
  glossary,
  onChange,
}: {
  glossary: GlossaryEntry[];
  onChange: (g: GlossaryEntry[]) => void;
}) {
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");

  const add = () => {
    if (!source.trim() || !target.trim()) return;
    const rest = glossary.filter((g) => g.source !== source.trim());
    onChange([...rest, { source: source.trim(), target: target.trim() }]);
    setSource("");
    setTarget("");
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Biar nama &amp; istilah konsisten. Contoh: <code>魔王</code> → <code>Raja Iblis</code>, <code>Rimuru</code> → <code>Rimuru</code>.
      </p>
      <div className="flex gap-2">
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Asli"
          className="w-full min-w-0 rounded-lg border border-zinc-300 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-700"
        />
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Terjemahan"
          className="w-full min-w-0 rounded-lg border border-zinc-300 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-700"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-lg bg-zinc-800 px-3 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900"
        >
          +
        </button>
      </div>
      {glossary.length > 0 && (
        <ul className="max-h-56 space-y-1 overflow-auto text-sm">
          {glossary.map((g) => (
            <li
              key={g.source}
              className="flex items-center justify-between gap-2 rounded-md bg-zinc-100 px-2 py-1 dark:bg-zinc-800"
            >
              <span className="truncate">
                {g.source} <span className="opacity-50">→</span> <b>{g.target}</b>
              </span>
              <button
                type="button"
                onClick={() => onChange(glossary.filter((x) => x.source !== g.source))}
                className="text-xs text-red-500 hover:underline"
                aria-label={`Hapus ${g.source}`}
              >
                hapus
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
