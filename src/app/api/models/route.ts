import { friendlyError, listModels, resolveProvider, type ResolvedProvider } from "@/lib/llm";
import { isProviderId } from "@/lib/providers";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("provider") ?? "";
  if (id && !isProviderId(id)) {
    return Response.json({ error: "Provider AI nggak dikenal." }, { status: 400 });
  }
  let provider: ResolvedProvider | undefined;
  try {
    // Daftar model harus bisa dimuat sebelum model pertama dipilih (9Router/LM Studio).
    provider = resolveProvider(id, undefined, false);
    const signal = AbortSignal.any([req.signal, AbortSignal.timeout(20_000)]);
    const models = [...new Set(await listModels(provider, signal))].sort();
    return Response.json({ models }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return Response.json({ error: friendlyError(err, provider) }, { status: 502 });
  }
}