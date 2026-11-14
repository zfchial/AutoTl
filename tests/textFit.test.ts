import { test } from "node:test";
import assert from "node:assert/strict";
import { fitText, wrapText } from "../src/lib/textFit.ts";

// Pengukur palsu: tiap karakter selebar 0.6 * fontSize.
const measure = (text: string, size: number) => text.length * size * 0.6;

test("wrapText membungkus per kata", () => {
  const lines = wrapText("aku nggak tahu deh", 60, 10, measure); // maks 10 karakter
  assert.deepEqual(lines, ["aku nggak", "tahu deh"]);
});

test("wrapText memotong kata yang kepanjangan dengan tanda hubung", () => {
  const lines = wrapText("aaaaaaaaaaaaaaa", 30, 10, measure); // maks 5 karakter
  for (const l of lines) assert.ok(measure(l, 10) <= 30, l);
  assert.equal(lines.join("").replace(/-/g, ""), "aaaaaaaaaaaaaaa");
});

test("wrapText menghormati baris baru", () => {
  assert.deepEqual(wrapText("Eh?\nBeneran?", 1000, 10, measure), ["Eh?", "Beneran?"]);
});

test("fitText mencari font terbesar yang muat", () => {
  const r = fitText("Halo", 100, 100, measure, { minSize: 8, maxSize: 60 });
  // "Halo" = 4 char * 0.6 = 2.4*size <= 100 -> size <= 41
  assert.equal(r.fontSize, 41);
  assert.deepEqual(r.lines, ["Halo"]);
});

test("fitText hasilnya selalu muat di kotak (kecuali mentok minSize)", () => {
  const text = "B-bukan berarti aku bikinin ini buat kamu, tahu!";
  const r = fitText(text, 120, 80, measure, { minSize: 6, maxSize: 40 });
  assert.ok(r.lines.length * r.lineHeight <= 80);
  for (const l of r.lines) assert.ok(measure(l, r.fontSize) <= 120);
});
