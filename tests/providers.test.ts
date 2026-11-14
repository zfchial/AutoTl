import { test } from "node:test";
import assert from "node:assert/strict";
import { PROVIDERS } from "../src/lib/providers.ts";
import { parseSettings } from "../src/lib/validate.ts";
import { listProviders, resolveProvider } from "../src/lib/llm/config.ts";
import { readSse } from "../src/lib/llm/sse.ts";
import { createThinkFilter, stripThink } from "../src/lib/llm/thinkFilter.ts";
import { LlmError, withRetry } from "../src/lib/llm/errors.ts";

test("settings lama tetap valid dan provider/model divalidasi", () => {
  assert.deepEqual(parseSettings(null), { provider: "", model: "", tone: "santai", keepHonorifics: true, sourceLang: "auto" });
  assert.equal(parseSettings({ provider: "9router", model: " combo " }).model, "combo");
  assert.equal(parseSettings({ provider: "9router" }).provider, "9router");
  assert.equal(parseSettings({ provider: "unknown", model: 12 }).provider, "");
  assert.equal(parseSettings({ model: "x".repeat(500) }).model.length, 200);
});

test("config: discovery 9Router tanpa model, override, key tetap privat", () => {
  const saved = { ...process.env };
  try {
    for (const p of PROVIDERS) for (const suffix of ["API_KEY", "BASE_URL", "MODEL", "JSON_MODE"]) delete process.env[`${p.envPrefix}_${suffix}`];
    delete process.env.AI_PROVIDER;
    process.env.GEMINI_API_KEY = "test-secret";
    assert.equal(resolveProvider().meta.id, "gemini");
    process.env.AI_PROVIDER = "9router";
    assert.equal(resolveProvider(undefined, undefined, false).baseUrl, "http://localhost:20128/v1");
    assert.throws(() => resolveProvider(), /belum dipilih/);
    process.env.NINEROUTER_API_KEY = "router-secret";
    assert.equal(resolveProvider("9router", "combo").model, "combo");
    assert.ok(!JSON.stringify(listProviders()).includes("secret"));
    assert.equal(listProviders().providers.find((p) => p.id === "9router")?.available, true);
    assert.throws(() => resolveProvider("openai"), /OPENAI_API_KEY/);
    assert.throws(() => resolveProvider("bad"), /nggak dikenal/);
    process.env.CUSTOM_BASE_URL = "file:///private";
    assert.throws(() => resolveProvider("custom", "model"), /HTTP/);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});

test("SSE: UTF-8 terpotong, CRLF, multiline, komentar, event terakhir", async () => {
  const bytes = new TextEncoder().encode(': keepalive\r\nevent: delta\r\ndata: 日本\r\ndata: dua\r\n\r\ndata: akhir');
  const body = new ReadableStream<Uint8Array>({ start(c) { for (const b of bytes) c.enqueue(Uint8Array.of(b)); c.close(); } });
  const events = [];
  for await (const ev of readSse(body)) events.push(ev);
  assert.deepEqual(events, [{ event: "delta", data: "日本\ndua" }, { event: undefined, data: "akhir" }]);
});

test("SSE: keluar lebih awal membatalkan body", async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode("data: satu\n\n")); }, cancel() { cancelled = true; } });
  for await (const ev of readSse(body)) { assert.equal(ev.data, "satu"); break; }
  assert.equal(cancelled, true);
});

test("filter reasoning menangani tag terpotong di setiap posisi", () => {
  const raw = "<think>rahasia</think>\nHalo dunia";
  for (let n = 0; n <= raw.length; n++) {
    const f = createThinkFilter();
    assert.equal(f.push(raw.slice(0, n)) + f.push(raw.slice(n)) + f.flush(), "Halo dunia");
  }
  assert.equal(stripThink("<think>belum selesai"), "");
  assert.equal(stripThink("Halo < tiga"), "Halo < tiga");
});

test("retry tidak mengulang 401 dan bisa dibatalkan saat backoff", async () => {
  let attempts = 0;
  await assert.rejects(withRetry(async () => { attempts++; throw new LlmError(401, "key"); }), /key/);
  assert.equal(attempts, 1);
  const controller = new AbortController();
  const pending = withRetry(async () => { throw new LlmError(429, "limit"); }, 4, controller.signal);
  controller.abort();
  await assert.rejects(pending);
});