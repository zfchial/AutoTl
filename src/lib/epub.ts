// Parser EPUB sederhana (jalan di browser): ambil teks per bab sesuai urutan spine.
import JSZip from "jszip";

export interface EpubChapter {
  title: string;
  text: string;
}

export interface EpubBook {
  title: string;
  chapters: EpubChapter[];
}

function resolvePath(base: string, href: string): string {
  const parts = (base ? base.split("/") : []).concat(decodeURIComponent(href.split("#")[0]).split("/"));
  const out: string[] = [];
  for (const p of parts) {
    if (p === "..") out.pop();
    else if (p && p !== ".") out.push(p);
  }
  return out.join("/");
}

const BLOCK_TAGS = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "BLOCKQUOTE", "SECTION", "ARTICLE", "TR", "HR"]);

/** Ubah dokumen XHTML jadi teks polos dengan paragraf dipisah baris kosong. */
function htmlToText(doc: Document): string {
  const lines: string[] = [];
  let current = "";
  const flush = () => {
    const t = current.replace(/\s+/g, " ").trim();
    if (t) lines.push(t);
    current = "";
  };
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      current += node.textContent ?? "";
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const tag = el.tagName.toUpperCase();
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "RT" || tag === "RP") return; // buang furigana
    if (tag === "BR") {
      flush();
      return;
    }
    const isBlock = BLOCK_TAGS.has(tag);
    if (isBlock) flush();
    el.childNodes.forEach(walk);
    if (isBlock) flush();
  };
  if (doc.body) walk(doc.body);
  flush();
  return lines.join("\n\n");
}

export async function parseEpub(file: File | ArrayBuffer): Promise<EpubBook> {
  const zip = await JSZip.loadAsync(file instanceof ArrayBuffer ? file : await file.arrayBuffer());
  const parser = new DOMParser();

  const container = await zip.file("META-INF/container.xml")?.async("string");
  if (!container) throw new Error("File EPUB nggak valid (container.xml nggak ada).");
  const opfPath = parser
    .parseFromString(container, "application/xml")
    .getElementsByTagName("rootfile")[0]
    ?.getAttribute("full-path");
  if (!opfPath) throw new Error("File EPUB nggak valid (OPF nggak ketemu).");

  const opfText = await zip.file(opfPath)?.async("string");
  if (!opfText) throw new Error("File EPUB nggak valid (OPF kosong).");
  const opf = parser.parseFromString(opfText, "application/xml");
  const baseDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/")) : "";

  const bookTitle = opf.getElementsByTagName("dc:title")[0]?.textContent?.trim() || "Tanpa Judul";

  const manifest = new Map<string, string>();
  for (const item of Array.from(opf.getElementsByTagName("item"))) {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    const type = item.getAttribute("media-type") ?? "";
    if (id && href && /html/.test(type)) manifest.set(id, resolvePath(baseDir, href));
  }

  const chapters: EpubChapter[] = [];
  for (const ref of Array.from(opf.getElementsByTagName("itemref"))) {
    const path = manifest.get(ref.getAttribute("idref") ?? "");
    if (!path) continue;
    const html = await zip.file(path)?.async("string");
    if (!html) continue;
    const doc = parser.parseFromString(html, "application/xhtml+xml");
    const safeDoc = doc.getElementsByTagName("parsererror").length ? parser.parseFromString(html, "text/html") : doc;
    const text = htmlToText(safeDoc);
    if (text.length < 20) continue; // lewati halaman kosong/cover
    const heading =
      safeDoc.querySelector("h1, h2, h3")?.textContent?.trim() ||
      safeDoc.querySelector("title")?.textContent?.trim() ||
      `Bagian ${chapters.length + 1}`;
    chapters.push({ title: heading.slice(0, 100), text });
  }

  if (!chapters.length) throw new Error("Nggak ada bab berisi teks di EPUB ini.");
  return { title: bookTitle, chapters };
}
