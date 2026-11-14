import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBubbles } from "../src/lib/mangaJson.ts";

test("parse bentuk { bubbles: [...] }", () => {
  const raw = JSON.stringify({
    bubbles: [{ box_2d: [100, 200, 300, 400], original: "なに？", translation: "Hah?", type: "dialog" }],
  });
  assert.deepEqual(parseBubbles(raw), [
    { box: [100, 200, 300, 400], original: "なに？", translation: "Hah?", type: "dialog" },
  ]);
});

test("parse array langsung dalam code fence markdown", () => {
  const raw = '```json\n[{"box_2d":[0,0,50,50],"original":"ドン","translation":"Duar!","type":"sfx"}]\n```';
  const r = parseBubbles(raw);
  assert.equal(r.length, 1);
  assert.equal(r[0].type, "sfx");
});

test("koordinat di-clamp dan urutan min/max dibetulkan", () => {
  const raw = JSON.stringify([{ box_2d: [1200, 500, -10, 100], translation: "Oke", type: "narasi" }]);
  assert.deepEqual(parseBubbles(raw)[0].box, [0, 100, 1000, 500]);
});

test("item rusak dibuang, tipe tak dikenal jadi dialog", () => {
  const raw = JSON.stringify([
    { box_2d: [1, 2, 3], translation: "x" }, // box kurang
    { box_2d: [0, 0, 100, 100], translation: "" }, // terjemahan kosong
    { box_2d: [0, 0, 1, 1], translation: "kecil" }, // terlalu kecil
    { box_2d: ["a", 0, 100, 100], translation: "nan" }, // bukan angka
    null,
    { box_2d: [10, 10, 200, 200], translation: "  Valid  ", type: "aneh" },
  ]);
  const r = parseBubbles(raw);
  assert.equal(r.length, 1);
  assert.equal(r[0].translation, "Valid");
  assert.equal(r[0].type, "dialog");
  assert.equal(r[0].original, "");
});

test("JSON tidak valid melempar error yang jelas", () => {
  assert.throws(() => parseBubbles("bukan json"), /bukan JSON/);
});

test("objek tanpa bubbles menghasilkan array kosong", () => {
  assert.deepEqual(parseBubbles("{}"), []);
});
