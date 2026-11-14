"use client";

import { useRef, useState } from "react";
import { fileToBase64 } from "@/lib/mangaRender";
import type { GlossaryEntry, MangaBubble, TranslateSettings } from "@/lib/types";

export type PageStatus = "idle" | "running" | "done" | "error";

export interface MangaPage {
  id: string;
  name: string;
  dataUrl: string;
  base64: string;
  mimeType: string;
  status: PageStatus;
  bubbles: MangaBubble[];
  error?: string;
}

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

/** Urutkan nama file secara natural (page2 < page10). */
const naturalSort = (a: File, b: File) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });

export function useMangaPages(settings: TranslateSettings, glossary: GlossaryEntry[]) {
  const [pages, setPages] = useState<MangaPage[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const stopRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const patchPage = (id: string, patch: Partial<MangaPage>) =>
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const addFiles = async (files: File[]) => {
    const skipped: string[] = [];
    const added: MangaPage[] = [];
    for (const file of [...files].sort(naturalSort)) {
      if (!ACCEPTED.includes(file.type)) {
        skipped.push(`${file.name} (format)`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        skipped.push(`${file.name} (>10MB)`);
        continue;
      }
      const { base64, dataUrl } = await fileToBase64(file);
      added.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        dataUrl,
        base64,
        mimeType: file.type,
        status: "idle",
        bubbles: [],
      });
    }
    setPages((prev) => [...prev, ...added]);
    setNotice(skipped.length ? `Dilewati: ${skipped.join(", ")}` : "");
    return added;
  };

  const translatePage = async (page: MangaPage, signal: AbortSignal) => {
    patchPage(page.id, { status: "running", error: undefined });
    try {
      const res = await fetch("/api/translate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: page.base64, mimeType: page.mimeType, settings, glossary }),
        signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Request gagal (${res.status}).`);
      const bubbles = (data.bubbles ?? []) as MangaBubble[];
      patchPage(page.id, { status: "done", bubbles, error: bubbles.length ? undefined : "Nggak ada teks yang kedeteksi." });
    } catch (err) {
      if (signal.aborted) patchPage(page.id, { status: "idle" });
      else patchPage(page.id, { status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  };

  /** Terjemahkan halaman satu per satu (biar aman dari limit kuota free tier). */
  const translateMany = async (targets: MangaPage[]) => {
    if (busy || !targets.length) return;
    setBusy(true);
    stopRef.current = false;
    const controller = new AbortController();
    abortRef.current = controller;
    for (const page of targets) {
      if (stopRef.current) break;
      await translatePage(page, controller.signal);
    }
    abortRef.current = null;
    setBusy(false);
  };

  const translatePending = () => translateMany(pages.filter((p) => p.status !== "done"));
  const retranslate = (id: string) => {
    const page = pages.find((p) => p.id === id);
    if (page) void translateMany([page]);
  };
  const stop = () => {
    stopRef.current = true;
    abortRef.current?.abort();
  };
  const removePage = (id: string) => setPages((prev) => prev.filter((p) => p.id !== id));
  const clearAll = () => setPages([]);
  const updateBubbles = (id: string, bubbles: MangaBubble[]) => patchPage(id, { bubbles });

  return { pages, busy, notice, addFiles, translatePending, retranslate, stop, removePage, clearAll, updateBubbles };
}
