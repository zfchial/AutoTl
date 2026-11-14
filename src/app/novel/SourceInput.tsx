"use client";

import { useRef, useState } from "react";
import { parseEpub, type EpubBook } from "@/lib/epub";

/** Input sumber: paste teks, upload .txt, atau upload .epub lalu pilih bab. */
export function SourceInput({
  text,
  onTextChange,
  onTitleChange,
}: {
  text: string;
  onTextChange: (t: string) => void;
  onTitleChange: (t: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [book, setBook] = useState<EpubBook | null>(null);
  const [chapterIdx, setChapterIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pickChapter = (b: EpubBook, i: number) => {
    setChapterIdx(i);
    onTextChange(b.chapters[i].text);
    onTitleChange(`${b.title} - ${b.chapters[i].title}`);
  };

  const handleFile = async (file: File) => {
    setError("");
    setLoading(true);
    try {
      if (/\.epub$/i.test(file.name)) {
        const parsed = await parseEpub(file);
        setBook(parsed);
        pickChapter(parsed, 0);
      } else {
        setBook(null);
        onTextChange(await file.text());
        onTitleChange(file.name.replace(/\.[^.]+$/, ""));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {loading ? "Membaca…" : "📂 Upload .txt / .epub"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.epub,text/plain,application/epub+zip"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {book && (
          <select
            value={chapterIdx}
            onChange={(e) => pickChapter(book, Number(e.target.value))}
            className="max-w-full flex-1 rounded-lg border border-zinc-300 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-700"
          >
            {book.chapters.map((c, i) => (
              <option key={i} value={i} className="bg-white dark:bg-zinc-900">
                {i + 1}. {c.title} ({c.text.length.toLocaleString("id-ID")} karakter)
              </option>
            ))}
          </select>
        )}
        <span className="ml-auto text-xs text-zinc-500">{text.length.toLocaleString("id-ID")} karakter</span>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Tempel teks bab light novel di sini (Jepang / Korea / Mandarin / Inggris)…"
        className="h-56 w-full resize-y rounded-xl border border-zinc-300 bg-transparent p-3 text-sm leading-relaxed dark:border-zinc-700"
      />
    </div>
  );
}
