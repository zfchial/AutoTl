import type { Metadata } from "next";
import { MangaTranslator } from "./MangaTranslator";

export const metadata: Metadata = {
  title: "Manga | AutoTL",
  description: "Terjemahin halaman manga/manhwa ke Bahasa Indonesia yang santai, langsung ditempel ke balon.",
};

export default function MangaPage() {
  return <MangaTranslator />;
}
