// Jalankan setelah build: node tests/routes.smoke.mjs
// Server upstream palsu: tidak memakai API key asli atau menghabiskan kuota.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout } from "node:timers/promises";

const upstream = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/v1/models") return res.end(JSON.stringify({ data: [{ id: "test-combo" }] }));
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = JSON.parse(raw);
  assert.equal(req.url, "/v1/chat/completions");
  assert.equal(body.model, "test-combo");
  assert.equal(req.headers.authorization, "Bearer smoke-secret");
  if (body.stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.end('data: {"choices":[{"delta":{"content":"Halo dunia"}}]}\n\ndata: [DONE]\n\n');
  } else {
    assert.equal(body.messages[1].content[1].image_url.url, "data:image/png;base64,aGVsbG8=");
    res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ bubbles: [{ box_2d: [10, 20, 100, 200], original: "Hello", translation: "Halo", type: "dialog" }] }) } }] }));
  }
});
upstream.listen(0, "127.0.0.1");
await once(upstream, "listening");
const port = 3018;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
  env: { ...process.env, AI_PROVIDER: "9router", NINEROUTER_BASE_URL: `http://127.0.0.1:${upstream.address().port}/v1`, NINEROUTER_API_KEY: "smoke-secret", NINEROUTER_MODEL: "test-combo" },
  stdio: "pipe",
});
let logs = "";
server.stdout.on("data", (data) => { logs += data; });
server.stderr.on("data", (data) => { logs += data; });
const url = `http://localhost:${port}`;
const post = (path, body) => fetch(`${url}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
try {
  let ready = false;
  for (let n = 0; n < 40; n++) {
    try { if ((await fetch(`${url}/api/providers`)).ok) { ready = true; break; } } catch { /* startup */ }
    await setTimeout(250);
  }
  assert.ok(ready, logs);
  const providers = await (await fetch(`${url}/api/providers`)).json();
  assert.equal(providers.defaultProvider, "9router");
  assert.ok(!JSON.stringify(providers).includes("smoke-secret"));
  assert.deepEqual(await (await fetch(`${url}/api/models?provider=9router`)).json(), { models: ["test-combo"] });
  const text = await post("/api/translate-text", { text: "Hello world", settings: { provider: "9router", model: "test-combo" } });
  assert.equal(text.status, 200);
  const events = (await text.text()).trim().split("\n").map(JSON.parse);
  assert.deepEqual(events.map((ev) => ev.type), ["meta", "delta", "done", "end"]);
  assert.equal(events[1].text, "Halo dunia");
  const image = await post("/api/translate-image", { image: "aGVsbG8=", mimeType: "image/png" });
  assert.equal(image.status, 200);
  assert.equal((await image.json()).bubbles[0].translation, "Halo");
  assert.equal((await post("/api/translate-text", null)).status, 400);
  assert.equal((await post("/api/translate-text", { text: "" })).status, 400);
  assert.equal((await post("/api/translate-image", { image: "x", mimeType: "text/plain" })).status, 415);
  assert.equal((await fetch(`${url}/api/models?provider=invalid`)).status, 400);
  for (const path of ["/", "/novel", "/manga"]) assert.equal((await fetch(url + path)).status, 200);
  console.log("PASS: provider/model discovery, novel NDJSON, manga JSON, validation, and pages (mock upstream).");
} finally {
  server.kill();
  upstream.closeAllConnections();
  upstream.close();
}