// Ekspor halaman manga hasil terjemahan ke PNG / ZIP (client only).
import JSZip from "jszip";
import { downloadBlob, safeFilename } from "./download";
import { loadImage, renderManga } from "./mangaRender";
import type { MangaBubble } from "./types";

export interface ExportablePage {
  name: string;
  dataUrl: string;
  bubbles: MangaBubble[];
}

export async function renderPageToBlob(page: ExportablePage): Promise<Blob> {
  const img = await loadImage(page.dataUrl);
  const canvas = document.createElement("canvas");
  renderManga(canvas, img, page.bubbles);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal render gambar."))), "image/png"),
  );
}

const pngName = (name: string) => `${safeFilename(name.replace(/\.[^.]+$/, ""))}_id.png`;

export async function downloadPagePng(page: ExportablePage) {
  downloadBlob(await renderPageToBlob(page), pngName(page.name));
}

export async function downloadPagesZip(pages: ExportablePage[], zipName = "manga_id.zip") {
  const zip = new JSZip();
  const used = new Set<string>();
  for (const [i, page] of pages.entries()) {
    let name = pngName(page.name);
    if (used.has(name)) name = `${String(i + 1).padStart(3, "0")}_${name}`;
    used.add(name);
    zip.file(name, await renderPageToBlob(page));
  }
  downloadBlob(await zip.generateAsync({ type: "blob" }), zipName);
}
