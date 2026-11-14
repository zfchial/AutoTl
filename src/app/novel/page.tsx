import type { Metadata } from "next";
import { NovelTranslator } from "./NovelTranslator";

export const metadata: Metadata = {
  title: "Light Novel | AutoTL",
  description: "Terjemahin light novel / web novel ke Bahasa Indonesia yang santai.",
};

export default function NovelPage() {
  return <NovelTranslator />;
}
