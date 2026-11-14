import { test } from "node:test";
import assert from "node:assert/strict";
import { getProviderMeta } from "../src/lib/providers.ts";
import { openaiAdapter } from "../src/lib/llm/openai.ts";
import { anthropicAdapter } from "../src/lib/llm/anthropic.ts";
import { generateJson } from "../src/lib/llm/index.ts";
import type { ResolvedProvider } from "../src/lib/llm/types.ts";

const router: ResolvedProvider = {
  meta: getProviderMeta("9router"), apiKey: "test-key", baseUrl: "http://localhost:20128/v1",
  model: "my-combo", jsonMode: "none",
};
const request = { system: "Terjemahkan", user: "Hello" };
const jsonRequest = { ...request, schema: { type: "object", properties: { bubbles: { type: "array" } } }, schemaName: "manga", image: { mimeType: "image/png", data: "aGVsbG8=" } };
const sse = (events: unknown[]) => new Response(events.map((e) => `data: ${typeof e === "string" ? e : JSON.stringify(e)}\n\n`).join(""));

test("9Router: endpoint, bearer, combo dan streaming tanpa reasoning", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(url, "http://localhost:20128/v1/chat/completions");
    assert.equal(new Headers(init.headers).get("Authorization"), "Bearer test-key");
    const body = JSON.parse(String(init.body));
    assert.equal(body.model, "my-combo");
    assert.equal(body.stream, true);
    assert.deepEqual(body.messages, [{ role: "system", content: "Terjemahkan" }, { role: "user", content: "Hello" }]);
    return sse([
      { choices: [{ delta: { reasoning_content: "hidden" } }] },
      { choices: [{ delta: { content: "<thi" } }] },
      { choices: [{ delta: { content: "nk>hidden</think>Halo" } }] },
      { choices: [{ delta: { content: " dunia" } }] }, "[DONE]",
    ]);
  });
  let text = "";
  for await (const delta of openaiAdapter.streamText(router, request)) text += delta;
  assert.equal(text, "Halo dunia");
});

test("9Router: model discovery tidak perlu model, auth opsional", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(url, `${router.baseUrl}/models`);
    assert.equal(new Headers(init.headers).has("Authorization"), false);
    return Response.json({ data: [{ id: "combo" }, { id: "kr/claude-sonnet-4.5" }] });
  });
  assert.deepEqual(await openaiAdapter.listModels({ ...router, model: "", apiKey: "" }), ["combo", "kr/claude-sonnet-4.5"]);
});

test("manga: data URL dan schema di prompt tetap ada ketika response_format ditolak", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    const content = body.messages[1].content;
    assert.equal(content[1].image_url.url, "data:image/png;base64,aGVsbG8=");
    assert.match(content[0].text, /"bubbles"/);
    calls++;
    if (calls === 1) {
      assert.equal(body.response_format.type, "json_schema");
      return Response.json({ error: { message: "response_format unsupported" } }, { status: 400 });
    }
    assert.equal(body.response_format, undefined);
    return Response.json({ choices: [{ message: { content: '{"bubbles":[]}' } }] });
  });
  assert.equal(await generateJson({ ...router, jsonMode: "schema" }, jsonRequest), '{"bubbles":[]}');
  assert.equal(calls, 2);
});

test("stream provider error dan output terpotong bukan sukses", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () => sse([{ error: { message: "upstream failed" } }]));
  await assert.rejects(async () => { for await (const text of openaiAdapter.streamText(router, request)) void text; }, /upstream failed/);
  mock.mock.mockImplementation(async () => sse([{ choices: [{ finish_reason: "length" }] }]));
  await assert.rejects(async () => { for await (const text of openaiAdapter.streamText(router, request)) void text; }, /terpotong/);
});

test("Anthropic: Messages auth, stream text_delta, dan image base64", async (t) => {
  const p = { ...router, meta: getProviderMeta("anthropic"), baseUrl: "https://api.anthropic.com/v1" };
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(url, `${p.baseUrl}/messages`);
    assert.equal(new Headers(init.headers).get("x-api-key"), "test-key");
    assert.equal(new Headers(init.headers).get("anthropic-version"), "2023-06-01");
    const body = JSON.parse(String(init.body));
    assert.equal(body.system, "Terjemahkan");
    if (body.stream) return sse([
      { type: "content_block_delta", delta: { type: "thinking_delta", thinking: "hidden" } },
      { type: "content_block_delta", delta: { type: "text_delta", text: "Halo" } },
    ]);
    assert.deepEqual(body.messages[0].content[0], { type: "image", source: { type: "base64", media_type: "image/png", data: "aGVsbG8=" } });
    return Response.json({ content: [{ type: "text", text: '{"bubbles":[]}' }] });
  });
  let text = "";
  for await (const delta of anthropicAdapter.streamText(p, request)) text += delta;
  assert.equal(text, "Halo");
  assert.equal(await anthropicAdapter.generateJson(p, jsonRequest), '{"bubbles":[]}');
});