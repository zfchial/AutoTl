// Baca config provider dari env (server-only). API key TIDAK pernah dikirim ke browser.
import "server-only";
import {
  PROVIDERS,
  getProviderMeta,
  isProviderId,
  type JsonMode,
  type ProviderId,
  type ProviderInfo,
  type ProviderMeta,
  type ProvidersResponse,
} from "../providers.ts";
import type { ResolvedProvider } from "./types";

const env = (name: string) => process.env[name]?.trim() ?? "";

const JSON_MODES: JsonMode[] = ["schema", "object", "none"];

function baseUrlOf(meta: ProviderMeta): string {
  return (env(`${meta.envPrefix}_BASE_URL`) || meta.baseUrl).replace(/\/+$/, "");
}

/** Provider dianggap siap kalau API key ada (provider berbayar) atau base URL ada (lokal/custom). */
function isAvailable(meta: ProviderMeta): boolean {
  if (meta.keyRequired) return !!env(`${meta.envPrefix}_API_KEY`);
  if (meta.id === "custom") return !!env("CUSTOM_BASE_URL");
  // Provider lokal hanya ditandai siap kalau user memang menyebutnya di env.
  return env("AI_PROVIDER").toLowerCase() === meta.id || !!(env(`${meta.envPrefix}_BASE_URL`) || env(`${meta.envPrefix}_API_KEY`) || env(`${meta.envPrefix}_MODEL`));
}

function defaultModelOf(meta: ProviderMeta): string {
  return env(`${meta.envPrefix}_MODEL`) || meta.defaultModel;
}

/** Provider default: AI_PROVIDER di env, atau provider pertama yang sudah dikonfigurasi. */
export function getDefaultProviderId(): ProviderId | null {
  const fromEnv = env("AI_PROVIDER").toLowerCase();
  if (isProviderId(fromEnv)) return fromEnv;
  return PROVIDERS.find(isAvailable)?.id ?? null;
}

export function listProviders(): ProvidersResponse {
  return {
    defaultProvider: getDefaultProviderId(),
    providers: PROVIDERS.map(
      (m): ProviderInfo => ({
        id: m.id,
        label: m.label,
        available: isAvailable(m),
        model: defaultModelOf(m),
        vision: m.vision,
        local: m.local,
        hint: m.hint,
      }),
    ),
  };
}

/**
 * Resolve provider + model untuk satu request.
 * `providerId` / `modelOverride` kosong = pakai default dari env.
 * Lempar Error dengan pesan jelas kalau config belum lengkap.
 */
export function resolveProvider(providerId?: string, modelOverride?: string, requireModel = true): ResolvedProvider {
  if (providerId && !isProviderId(providerId)) throw new Error("Provider AI nggak dikenal.");
  if (!providerId && env("AI_PROVIDER") && !isProviderId(env("AI_PROVIDER").toLowerCase())) {
    throw new Error("AI_PROVIDER nggak valid. Cek .env.local.");
  }
  const id = isProviderId(providerId) ? providerId : getDefaultProviderId();
  if (!id) {
    throw new Error(
      "Belum ada provider AI yang dikonfigurasi. Salin .env.local.example jadi .env.local lalu isi minimal satu API key (mis. GEMINI_API_KEY) atau set AI_PROVIDER.",
    );
  }
  const meta = getProviderMeta(id);
  const apiKey = env(`${meta.envPrefix}_API_KEY`);
  const baseUrl = baseUrlOf(meta);
  const model = modelOverride?.trim() || defaultModelOf(meta);
  const jsonEnv = env(`${meta.envPrefix}_JSON_MODE`).toLowerCase() as JsonMode;
  const jsonMode = JSON_MODES.includes(jsonEnv) ? jsonEnv : meta.jsonMode;

  if (meta.keyRequired && !apiKey) {
    throw new Error(`${meta.envPrefix}_API_KEY belum diisi di .env.local (buat provider ${meta.label}).`);
  }
  if (meta.kind !== "gemini" && !baseUrl) {
    throw new Error(`${meta.envPrefix}_BASE_URL belum diisi di .env.local (buat provider ${meta.label}).`);
  }
  if (baseUrl) {
    const url = new URL(baseUrl);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error(`${meta.envPrefix}_BASE_URL harus URL HTTP(S) tanpa kredensial, query, atau fragment.`);
    }
  }
  if (requireModel && !model) {
    throw new Error(`Model buat ${meta.label} belum dipilih. Pilih di Pengaturan atau isi ${meta.envPrefix}_MODEL di .env.local.`);
  }
  return { meta, apiKey, baseUrl, model, jsonMode };
}
