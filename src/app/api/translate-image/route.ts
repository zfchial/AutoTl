// POST /api/translate-image
// Body: { image: base64 (tanpa prefix data:), mimeType, settings?, glossary? }
// Response: { bubbles: MangaBubble[] }

import { friendlyError, generateJson, resolveProvider, type ResolvedProvider } from "@/lib/llm";
import { parseBubbles } from "@/lib/mangaJson";
import { MANGA_RESPONSE_SCHEMA, MANGA_USER_PROMPT } from "@/lib/mangaSchema";
import { buildMangaSystemPrompt } from "@/lib/prompts";
import { parseGlossary, parseSettings } from "@/lib/validate";

export const maxDuration = 120;

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"];
const MAX_BASE64_CHARS = 14_000_000; // ~10 MB gambar

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid body");
  } catch {
    return Response.json({ error: "Body harus JSON." }, { status: 400 });
  }

  const image = typeof body.image === "string" ? body.image.replace(/^data:[^,]+,/, "") : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
  if (!image) return Response.json({ error: "Gambarnya belum dikirim." }, { status: 400 });
  if (!ALLOWED_MIME.includes(mimeType)) {
    return Response.json({ error: `Format gambar nggak didukung (${mimeType || "unknown"}). Pakai PNG/JPG/WEBP.` }, { status: 415 });
  }
  if (image.length > MAX_BASE64_CHARS) {
    return Response.json({ error: "Gambar terlalu besar (maks ~10 MB)." }, { status: 413 });
  }

  const settings = parseSettings(body.settings);
  const glossary = parseGlossary(body.glossary);

  let provider: ResolvedProvider | undefined;
  try {
    provider = resolveProvider(settings.provider, settings.model);
    if (!provider.meta.vision) {
      return Response.json({ error: `${provider.meta.label} hanya mendukung teks. Pilih provider/model vision untuk manga.` }, { status: 400 });
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(mimeType) && provider.meta.kind !== "gemini") {
      return Response.json({ error: "Untuk provider ini, pakai PNG/JPG/WEBP." }, { status: 415 });
    }
    const raw = await generateJson(provider, {
      system: buildMangaSystemPrompt(settings, glossary),
      user: MANGA_USER_PROMPT,
      image: { mimeType, data: image },
      schema: MANGA_RESPONSE_SCHEMA,
      schemaName: "manga_bubbles",
      temperature: 0.4,
      signal: req.signal,
    });
    return Response.json({ bubbles: parseBubbles(raw) });
  } catch (err) {
    return Response.json({ error: friendlyError(err, provider) }, { status: 502 });
  }
}
