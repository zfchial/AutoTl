"use client";

import { useRef, useState } from "react";
import { streamTranslate } from "@/lib/streamClient";
import type { GlossaryEntry, TextStreamEvent, TranslateSettings } from "@/lib/types";
import type { ChunkState } from "./ChunkRow";

/** State + logika terjemahan LN (stream per potongan, retry, stop, edit). */
export function useNovelTranslation(settings: TranslateSettings, glossary: GlossaryEntry[]) {
  const [chunks, setChunks] = useState<ChunkState[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const patchChunk = (index: number, patch: (c: ChunkState) => Partial<ChunkState>) =>
    setChunks((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch(c) } : c)));

  /** Tandai potongan idx selesai/gagal; kalau mode full, potongan berikutnya jadi "running". */
  const finishChunk = (idx: number, patch: Partial<ChunkState>, advance: boolean) =>
    setChunks((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, ...patch } : advance && i === idx + 1 ? { ...c, status: "running" } : c)),
    );

  /** `offset` = indeks potongan saat retry satu potongan; null = terjemahan penuh. */
  const applyEvent = (ev: TextStreamEvent, offset: number | null) => {
    const full = offset === null;
    switch (ev.type) {
      case "meta":
        if (full) setChunks(ev.chunks.map((source, i) => ({ source, output: "", status: i === 0 ? "running" : "pending" })));
        break;
      case "delta":
        patchChunk(offset ?? ev.index, (c) => ({ output: c.output + ev.text, status: "running" }));
        break;
      case "done":
        finishChunk(offset ?? ev.index, { status: "done" }, full);
        break;
      case "error":
        if (ev.index === undefined) setError(ev.message);
        else finishChunk(offset ?? ev.index, { status: "error", error: ev.message }, full);
        break;
    }
  };

  const run = async (text: string, offset: number | null, previousContext?: string) => {
    setBusy(true);
    setError("");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamTranslate({ text, settings, glossary, previousContext }, (ev) => applyEvent(ev, offset), controller.signal);
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      abortRef.current = null;
      // Potongan yang belum kelar (karena stop/error jaringan) dirapikan statusnya.
      setChunks((prev) =>
        prev.map((c) =>
          c.status === "running" || c.status === "pending"
            ? c.output
              ? { ...c, status: "done" }
              : { ...c, status: "error", error: "Dibatalkan / belum diterjemahkan." }
            : c,
        ),
      );
    }
  };

  const translateAll = (text: string) => {
    if (!text.trim() || busy) return;
    setChunks([]);
    void run(text, null);
  };

  const retryChunk = (index: number) => {
    if (busy || !chunks[index]) return;
    patchChunk(index, () => ({ output: "", status: "running", error: undefined }));
    const previous = index > 0 ? chunks[index - 1].output.slice(-600) : undefined;
    void run(chunks[index].source, index, previous);
  };

  const editChunk = (index: number, output: string) => patchChunk(index, () => ({ output }));
  const stop = () => abortRef.current?.abort();

  const fullText = chunks.map((c) => c.output.trim()).filter(Boolean).join("\n\n");
  const doneCount = chunks.filter((c) => c.status === "done").length;

  return { chunks, busy, error, fullText, doneCount, translateAll, retryChunk, editChunk, stop };
}
