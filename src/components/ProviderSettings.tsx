"use client";

import { useEffect, useId, useRef, useState } from "react";
import { getProviderMeta, PROVIDERS, type ProviderId, type ProvidersResponse } from "@/lib/providers";
import type { TranslateSettings } from "@/lib/types";

const field = "w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700";

export function ProviderSettings({ settings, onChange }: {
  settings: TranslateSettings;
  onChange: (s: TranslateSettings) => void;
}) {
  const [info, setInfo] = useState<ProvidersResponse | null>(null);
  const [error, setError] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);
  const listId = useId();

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/providers", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Gagal membaca konfigurasi provider.");
        setInfo(await res.json());
      })
      .catch((err) => { if (!controller.signal.aborted) setError(String(err)); });
    return () => { controller.abort(); request.current?.abort(); };
  }, []);

  const id = settings.provider || info?.defaultProvider;
  const meta = id ? getProviderMeta(id) : null;
  const active = info?.providers.find((p) => p.id === id);

  const loadModels = async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/models?provider=${encodeURIComponent(id ?? "")}`, { signal: controller.signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal memuat model.");
      setModels(data.models);
      if (!data.models.length) setError("Daftar model kosong. Kamu tetap bisa mengetik ID model manual.");
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  return (
    <div className="space-y-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
      <label className="block text-sm">
        <span className="mb-1 block font-semibold">Provider AI</span>
        <select className={field} value={settings.provider || ""} onChange={(e) => {
          request.current?.abort();
          setLoading(false);
          setModels([]);
          setError("");
          onChange({ ...settings, provider: e.target.value as ProviderId | "", model: "" });
        }}>
          <option value="" className="bg-white dark:bg-zinc-900">Default server{info?.defaultProvider ? ` (${getProviderMeta(info.defaultProvider).label})` : ""}</option>
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id} className="bg-white dark:bg-zinc-900">
              {p.label}{info?.providers.find((v) => v.id === p.id)?.available ? " — dikonfigurasi" : ""}
            </option>
          ))}
        </select>
      </label>
      {meta && <p className="text-xs text-zinc-500">{meta.hint}</p>}
      {active && !active.available && <p className="text-xs text-amber-600">Belum ditandai dikonfigurasi. Cek {meta?.envPrefix}_API_KEY / _BASE_URL di .env.local.</p>}
      <label className="block text-sm">
        <span className="mb-1 block font-semibold">Model / combo</span>
        <input className={field} value={settings.model || ""} list={listId} maxLength={200}
          placeholder={active?.model || meta?.defaultModel || "Ketik ID model atau muat daftar"}
          onChange={(e) => onChange({ ...settings, model: e.target.value })} />
        <datalist id={listId}>{models.map((m) => <option key={m} value={m} />)}</datalist>
      </label>
      <button type="button" disabled={loading || !id} onClick={() => void loadModels()}
        className="rounded-lg border border-zinc-300 px-3 py-1 text-sm disabled:opacity-40 dark:border-zinc-700">
        {loading ? "Memuat…" : "Muat daftar model"}
      </button>
      <p className="text-xs text-zinc-500">Kosongkan model untuk default server. Manga wajib memakai model vision; tidak semua model/combo mendukung gambar. API key hanya disimpan di server.</p>
      {meta && !meta.vision && <p className="text-xs text-amber-600">Provider ini hanya untuk light novel, bukan manga.</p>}
      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
    </div>
  );
}