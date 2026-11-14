// Daftar provider AI yang didukung. Aman dipakai di client (nggak ada API key di sini).
// Server membaca config dari env dengan pola <envPrefix>_API_KEY, _BASE_URL, _MODEL, _JSON_MODE.

export type ProviderId =
  | "gemini"
  | "openai"
  | "anthropic"
  | "openrouter"
  | "9router"
  | "groq"
  | "deepseek"
  | "mistral"
  | "together"
  | "ollama"
  | "lmstudio"
  | "custom";

/** Format API yang dipakai provider. */
export type ProviderKind = "gemini" | "anthropic" | "openai";

/**
 * Cara minta output JSON (khusus provider OpenAI-compatible):
 * schema = response_format json_schema, object = json_object, none = cuma lewat prompt.
 */
export type JsonMode = "schema" | "object" | "none";

export interface ProviderMeta {
  id: ProviderId;
  label: string;
  kind: ProviderKind;
  envPrefix: string;
  /** Base URL default tanpa slash di akhir. Kosong = wajib diisi lewat env. */
  baseUrl: string;
  /** Model default. Kosong = user wajib pilih/isi model. */
  defaultModel: string;
  keyRequired: boolean;
  /** Provider yang jalan di komputer sendiri. */
  local: boolean;
  jsonMode: JsonMode;
  /** Umumnya bisa baca gambar (buat fitur manga). */
  vision: boolean;
  hint: string;
}

type Def = Omit<ProviderMeta, "keyRequired" | "local" | "jsonMode" | "vision"> & Partial<ProviderMeta>;

const def = (d: Def): ProviderMeta => ({ keyRequired: true, local: false, jsonMode: "none", vision: true, ...d });

export const PROVIDERS: ProviderMeta[] = [
  def({
    id: "gemini",
    label: "Google Gemini",
    kind: "gemini",
    envPrefix: "GEMINI",
    baseUrl: "",
    defaultModel: "gemini-3.8-flash",
    jsonMode: "schema",
    hint: "Key: aistudio.google.com/apikey. Mendukung teks dan gambar.",
  }),
  def({
    id: "openai",
    label: "OpenAI",
    kind: "openai",
    envPrefix: "OPENAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4.1-mini",
    jsonMode: "schema",
    hint: "Key: platform.openai.com/api-keys",
  }),
  def({
    id: "anthropic",
    label: "Anthropic (Claude)",
    kind: "anthropic",
    envPrefix: "ANTHROPIC",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-4-5",
    hint: "Key: console.anthropic.com",
  }),
  def({
    id: "openrouter",
    label: "OpenRouter",
    kind: "openai",
    envPrefix: "OPENROUTER",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "google/gemini-2.5-flash",
    hint: "Satu key buat ratusan model (format vendor/model). Key: openrouter.ai/keys",
  }),
  def({
    id: "9router",
    label: "9Router",
    kind: "openai",
    envPrefix: "NINEROUTER",
    baseUrl: "http://localhost:20128/v1",
    defaultModel: "",
    keyRequired: false,
    local: true,
    hint: "AI router lokal (github.com/decolua/9router). Jalankan 9router, lalu pilih model/combo, mis. kr/claude-sonnet-4.5.",
  }),
  def({
    id: "groq",
    label: "Groq",
    kind: "openai",
    envPrefix: "GROQ",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "meta-llama/llama-4-scout-17b-16e-instruct",
    jsonMode: "object",
    hint: "Super cepat, ada free tier. Key: console.groq.com/keys",
  }),
  def({
    id: "deepseek",
    label: "DeepSeek",
    kind: "openai",
    envPrefix: "DEEPSEEK",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    jsonMode: "object",
    vision: false,
    hint: "Murah buat light novel. API resminya belum bisa baca gambar (manga).",
  }),
  def({
    id: "mistral",
    label: "Mistral",
    kind: "openai",
    envPrefix: "MISTRAL",
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-small-latest",
    jsonMode: "object",
    hint: "Key: console.mistral.ai",
  }),
  def({
    id: "together",
    label: "Together AI",
    kind: "openai",
    envPrefix: "TOGETHER",
    baseUrl: "https://api.together.xyz/v1",
    defaultModel: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    hint: "Key: api.together.ai",
  }),
  def({
    id: "ollama",
    label: "Ollama (lokal)",
    kind: "openai",
    envPrefix: "OLLAMA",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "qwen2.5vl:7b",
    keyRequired: false,
    local: true,
    jsonMode: "object",
    hint: "Model jalan di komputer sendiri. Buat manga pakai model vision (qwen2.5vl, gemma3, llava).",
  }),
  def({
    id: "lmstudio",
    label: "LM Studio (lokal)",
    kind: "openai",
    envPrefix: "LMSTUDIO",
    baseUrl: "http://localhost:1234/v1",
    defaultModel: "",
    keyRequired: false,
    local: true,
    jsonMode: "schema",
    hint: "Nyalakan server di tab Developer LM Studio, lalu muat daftar model.",
  }),
  def({
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    kind: "openai",
    envPrefix: "CUSTOM",
    baseUrl: "",
    defaultModel: "",
    keyRequired: false,
    hint: "Endpoint OpenAI-compatible apa aja (vLLM, LiteLLM, OmniRoute, dll). Isi CUSTOM_BASE_URL di .env.local.",
  }),
];

export const PROVIDER_IDS: ProviderId[] = PROVIDERS.map((p) => p.id);

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && (PROVIDER_IDS as string[]).includes(value);
}

export function getProviderMeta(id: ProviderId): ProviderMeta {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

/** Info provider yang dikirim ke browser oleh GET /api/providers (tanpa API key). */
export interface ProviderInfo {
  id: ProviderId;
  label: string;
  /** Sudah dikonfigurasi (API key / base URL ada). */
  available: boolean;
  /** Model default efektif (dari env atau bawaan). */
  model: string;
  vision: boolean;
  local: boolean;
  hint: string;
}

export interface ProvidersResponse {
  defaultProvider: ProviderId | null;
  providers: ProviderInfo[];
}

