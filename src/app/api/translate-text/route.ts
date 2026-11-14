// POST /api/translate-text
// Body: { text: string, settings?, glossary?, chunkSize? }
// Response: stream NDJSON (satu TextStreamEvent per baris), terjemahan muncul bertahap per potongan.

import { friendlyError, resolveProvider, streamText } from "@/lib/llm";
import { DEFAULT_CHUNK_SIZE, splitIntoChunks } from "@/lib/chunker";
import { buildTextSystemPrompt, buildTextUserPrompt } from "@/lib/prompts";
import { parseGlossary, parseSettings } from "@/lib/validate";
import type { TextStreamEvent } from "@/lib/types";

export const maxDuration = 300;

const MAX_INPUT_CHARS = 200_000;
const CONTEXT_TAIL_CHARS = 600;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid body");
  } catch {
    return Response.json({ error: "Body harus JSON." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text : "";
  if (!text.trim()) return Response.json({ error: "Teksnya masih kosong." }, { status: 400 });
  if (text.length > MAX_INPUT_CHARS) {
    return Response.json(
      { error: `Teks terlalu panjang (maks ${MAX_INPUT_CHARS.toLocaleString("id-ID")} karakter per request). Pecah per bab ya.` },
      { status: 413 },
    );
  }

  const settings = parseSettings(body.settings);
  const glossary = parseGlossary(body.glossary);
  const chunkSize =
    typeof body.chunkSize === "number" && body.chunkSize >= 500 && body.chunkSize <= 8000 ? body.chunkSize : DEFAULT_CHUNK_SIZE;
  const previousContextInput = typeof body.previousContext === "string" ? body.previousContext.slice(-CONTEXT_TAIL_CHARS) : "";

  let provider;
  try {
    provider = resolveProvider(settings.provider, settings.model);
  } catch (err) {
    return Response.json({ error: friendlyError(err) }, { status: 500 });
  }

  const chunks = splitIntoChunks(text, chunkSize);
  const systemInstruction = buildTextSystemPrompt(settings, glossary);
  const encoder = new TextEncoder();
  const abort = new AbortController();
  const signal = AbortSignal.any([req.signal, abort.signal]);
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: TextStreamEvent) => {
        if (!cancelled) controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));
      };
      send({ type: "meta", total: chunks.length, chunks });

      let previous = previousContextInput;
      for (let i = 0; i < chunks.length; i++) {
        if (signal.aborted) break;
        let output = "";
        try {
          // Retry hanya untuk membuka stream; kalau gagal di tengah, potongan ini dilaporkan error.
          const response = streamText(provider, {
            system: systemInstruction,
            user: buildTextUserPrompt(chunks[i], previous),
            signal,
          });
          for await (const delta of response) {
            if (delta) {
              output += delta;
              send({ type: "delta", index: i, text: delta });
            }
          }
          if (!output.trim()) throw new Error(`${provider.meta.label} nggak ngasih teks terjemahan.`);
          send({ type: "done", index: i });
          previous = output.slice(-CONTEXT_TAIL_CHARS);
        } catch (err) {
          if (signal.aborted) break;
          send({ type: "error", index: i, message: friendlyError(err, provider) });
        }
      }
      send({ type: "end" });
      if (!cancelled) controller.close();
    },
    cancel() {
      cancelled = true;
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
