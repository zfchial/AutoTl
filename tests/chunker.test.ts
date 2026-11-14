import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeText, splitIntoChunks } from "../src/lib/chunker.ts";

test("teks kosong menghasilkan array kosong", () => {
  assert.deepEqual(splitIntoChunks(""), []);
  assert.deepEqual(splitIntoChunks("   \n\n  "), []);
});

test("normalisasi CRLF dan spasi di ujung baris", () => {
  assert.equal(normalizeText("a  \r\nb\r\n"), "a\nb");
});

test("teks pendek jadi satu potongan, paragraf dipisah baris kosong", () => {
  const chunks = splitIntoChunks("Halo.\n\n\nApa kabar?\nBaik.", 3000);
  assert.deepEqual(chunks, ["Halo.\n\nApa kabar?\n\nBaik."]);
});

test("paragraf tidak terpotong dan tiap potongan <= maxChars", () => {
  const para = "あ".repeat(400);
  const text = Array.from({ length: 10 }, () => para).join("\n");
  const chunks = splitIntoChunks(text, 1000);
  assert.equal(chunks.length, 5); // 2 paragraf per potongan (400+2+400=802)
  for (const c of chunks) {
    assert.ok(c.length <= 1000, `kepanjangan: ${c.length}`);
    for (const p of c.split("\n\n")) assert.equal(p.length, 400);
  }
});

test("paragraf super panjang dipecah per kalimat", () => {
  const sentence = "これはテストの文です。"; // 11 karakter
  const para = sentence.repeat(50); // 550
  const chunks = splitIntoChunks(para, 100);
  assert.ok(chunks.length > 1);
  for (const c of chunks) {
    assert.ok(c.length <= 100);
    assert.ok(c.endsWith("。"), `harus berakhir di akhir kalimat: ${c}`);
  }
  assert.equal(chunks.join(""), para);
});

test("kalimat tanpa tanda baca dipotong paksa", () => {
  const chunks = splitIntoChunks("x".repeat(250), 100);
  assert.deepEqual(chunks.map((c) => c.length), [100, 100, 50]);
});

test("isi teks tidak hilang dan kata tidak terbelah", () => {
  const text = "Paragraf satu.\nParagraf dua yang lebih panjang!\n「Dialog?」\n***\nAkhir.";
  const chunks = splitIntoChunks(text, 30);
  const joined = chunks.join("\n");
  for (const word of ["satu", "panjang!", "Dialog", "***", "Akhir"]) assert.ok(joined.includes(word), word);
  for (const c of chunks) assert.ok(c.length <= 30, c);
});

test("kalimat panjang berspasi dipotong di spasi", () => {
  const sentence = Array.from({ length: 40 }, (_, i) => `kata${i}`).join(" ");
  const chunks = splitIntoChunks(sentence, 50);
  for (const c of chunks) {
    assert.ok(c.length <= 50);
    assert.match(c, /^kata\d+( kata\d+)*$/);
  }
  assert.equal(chunks.join(" "), sentence);
});
