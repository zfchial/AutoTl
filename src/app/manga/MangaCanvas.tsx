"use client";

import { useEffect, useRef, useState } from "react";
import { hitTest, loadImage, renderManga } from "@/lib/mangaRender";
import type { MangaBubble } from "@/lib/types";

/** Canvas yang menampilkan halaman hasil terjemahan. Klik balon untuk memilihnya. */
export function MangaCanvas({
  src,
  bubbles,
  showOriginal,
  showBoxes,
  selectedIndex,
  onSelect,
}: {
  src: string;
  bubbles: MangaBubble[];
  showOriginal: boolean;
  showBoxes: boolean;
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<{ src: string; img: HTMLImageElement } | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadImage(src)
      .then((img) => !cancelled && setImage({ src, img }))
      .catch((e: Error) => !cancelled && setLoadError(e.message));
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image || image.src !== src) return;
    renderManga(canvas, image.img, showOriginal ? [] : bubbles, { showBoxes, selectedIndex });
  }, [image, src, bubbles, showOriginal, showBoxes, selectedIndex]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || showOriginal) return;
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const py = ((e.clientY - rect.top) / rect.height) * canvas.height;
    onSelect(hitTest(bubbles, px, py, canvas.width, canvas.height));
  };

  if (loadError) return <p className="text-sm text-red-500">{loadError}</p>;
  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="mx-auto block h-auto max-w-full cursor-pointer rounded-lg shadow"
    />
  );
}
