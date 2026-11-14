# AutoTL

Web app buat auto-translate **light novel** dan **manga/manhwa** ke Bahasa Indonesia yang santai (nggak kaku), dengan berbagai provider AI termasuk **9Router**.

## Setup

```bash
npm install
cp .env.local.example .env.local   # Windows: copy .env.local.example .env.local
# isi GEMINI_API_KEY (gratis: https://aistudio.google.com/apikey)
npm run dev
```

Buka http://localhost:3000.

| Env | Default | Keterangan |
| --- | --- | --- |
| `AI_PROVIDER` | otomatis | ID provider default; kosong = provider pertama yang dikonfigurasi. |
| `GEMINI_API_KEY` | – | Wajib hanya kalau memakai Gemini. Semua API key hanya dipakai di server. |
| `GEMINI_MODEL` | `gemini-3.8-flash` | Harus support input gambar (buat manga). |
| `GEMINI_THINKING_LEVEL` | (kosong) | `MINIMAL`/`LOW`/`MEDIUM`/`HIGH`. `LOW` biasanya cukup & lebih cepat. |

## Provider & model

Pilih **Provider AI** di Pengaturan (halaman novel maupun manga). Model bisa diketik manual atau dipilih melalui **Muat daftar model**. Kosongkan model untuk memakai default server. Mengganti provider akan mengosongkan pilihan model supaya model provider lama tidak ikut terkirim. Pengaturan lama tetap kompatibel.

| Provider ID | Prefix env | Base URL bawaan |
| --- | --- | --- |
| `gemini` | `GEMINI` | SDK Google Gemini |
| `openai` | `OPENAI` | `https://api.openai.com/v1` |
| `anthropic` | `ANTHROPIC` | `https://api.anthropic.com/v1` |
| `openrouter` | `OPENROUTER` | `https://openrouter.ai/api/v1` |
| `9router` | `NINEROUTER` | `http://localhost:20128/v1` |
| `groq` | `GROQ` | `https://api.groq.com/openai/v1` |
| `deepseek` | `DEEPSEEK` | `https://api.deepseek.com/v1` |
| `mistral` | `MISTRAL` | `https://api.mistral.ai/v1` |
| `together` | `TOGETHER` | `https://api.together.xyz/v1` |
| `ollama` | `OLLAMA` | `http://localhost:11434/v1` |
| `lmstudio` | `LMSTUDIO` | `http://localhost:1234/v1` |
| `custom` | `CUSTOM` | wajib isi sendiri |

Untuk setiap prefix, tersedia `<PREFIX>_API_KEY`, `<PREFIX>_MODEL`, dan `<PREFIX>_BASE_URL`. Model bawaan hanya titik awal; ketersediaan/akses bergantung provider. Key opsional untuk server lokal/custom yang tidak mewajibkan auth. Base URL dan key tidak bisa diubah lewat request browser. Restart server setelah mengubah env.

### Setup 9Router

1. Jalankan [9Router](https://github.com/decolua/9router) dan hubungkan provider di dashboard-nya.
2. Isi `.env.local`:

```dotenv
AI_PROVIDER=9router
NINEROUTER_BASE_URL=http://localhost:20128/v1
NINEROUTER_API_KEY=
NINEROUTER_MODEL=
```

3. Isi key jika autentikasi di 9Router diaktifkan. AutoTL mengirimnya sebagai `Authorization: Bearer ...`.
4. Pilih 9Router di Pengaturan → **Muat daftar model**, lalu pilih ID model/combo yang sudah tersedia. Alternatif: isi `NINEROUTER_MODEL` dengan ID dari dashboard (termasuk prefix provider bila ada).

AutoTL memakai `GET /v1/models` dan `POST /v1/chat/completions`, dengan streaming untuk novel dan input gambar untuk manga. Dukungan vision bergantung model **dan** rute upstream 9Router; untuk combo, pastikan semua fallback mendukung gambar. Matikan fitur pemendekan/penyuntingan prompt router jika mengubah hasil terjemahan.

**Deployment:** `localhost` adalah mesin tempat server AutoTL berjalan, bukan komputer browser. Dalam Docker, gunakan alamat router yang bisa dijangkau container (mis. `host.docker.internal`). Jangan membuka AutoTL ke publik tanpa autentikasi/rate limiting di reverse proxy: endpoint terjemahan memakai key server dan bisa menghabiskan kuota.

**Manga:** wajib model vision; DeepSeek ditandai teks-only. Format JSON OpenAI-compatible bisa diatur lewat `<PREFIX>_JSON_MODE= schema | object | none` (tanpa spasi pada nilainya). `none` tetap mengirim schema lewat prompt, cocok untuk router yang tidak mendukung structured output. Kalau provider menolak parameter `temperature`/`response_format`, request dicoba sekali lagi tanpa parameter opsional tersebut.

## Fitur

**📚 Light Novel (`/novel`)**
- Input: paste teks, upload `.txt`, atau `.epub` (pilih bab).
- Teks dipecah per paragraf (~3000 karakter), diterjemahin bertahap (streaming); akhir potongan sebelumnya dikirim sebagai konteks.
- Tampilan berdampingan asli/terjemahan, ulang per bagian, edit manual, salin, unduh `.txt`/`.md`.

**🖼️ Manga (`/manga`)**
- Upload banyak halaman (drag & drop). Model vision mendeteksi balon (`box_2d` 0–1000) + menerjemahkan.
- Balon ditutup warna latar (disampling dari pinggir kotak), teks terjemahan di-auto-fit ke balon.
- Klik balon buat milih, edit teks/tipe/hapus di panel kiri. Unduh PNG per halaman atau ZIP.

**Umum:** 3 gaya bahasa (Santai / Gaul / Semi-formal), honorifik bisa dipertahankan atau diganti, glosarium nama & istilah. Pengaturan disimpan di localStorage. Retry otomatis untuk error 429/5xx.

## Struktur

```
src/lib/prompts.ts        # aturan gaya bahasa (atur "kesantaian" di sini)
src/lib/providers.ts      # katalog provider (metadata publik)
src/lib/llm/              # adapter Gemini/OpenAI-compatible/Anthropic, config & retry server-only
src/lib/chunker.ts        # pemecah teks per paragraf
src/lib/epub.ts           # parser EPUB (browser)
src/lib/mangaJson.ts      # parser/validator JSON balon
src/lib/textFit.ts        # word-wrap + auto-fit font
src/lib/mangaRender.ts    # render ke canvas
src/app/api/translate-text   # stream NDJSON
src/app/api/translate-image  # deteksi + terjemah balon
```

## Scripts

- `npm run dev`: development
- `npm run build` / `npm start`: production
- `npm test`: unit test (chunker, parser JSON, text-fit, config provider, SSE, adapter dengan mock HTTP). Kondisi `react-server` memungkinkan import modul server-only saat tes.
- `npm run lint`, `npm run typecheck`
- Setelah build: `node tests/routes.smoke.mjs` menguji endpoint produksi dengan upstream OpenAI-compatible tiruan (port AutoTL 3018 harus kosong, tanpa biaya API).

## Keterbatasan

- Teks asli di manga cuma **ditutup** warna latar (belum inpainting), jadi di balon dengan latar bergambar/gradasi hasilnya kelihatan kotak.
- Akurasi kotak balon tergantung model; pakai "Tampilkan kotak" + edit manual kalau meleset.
- Free tier Gemini punya limit request per menit/hari; halaman manga diproses satu per satu supaya aman.
- Hasil terjemahan belum disimpan permanen (hilang kalau halaman di-refresh). Unduh dulu ya.
- Sengaja nggak ada fitur ambil bab dari URL situs lain (rawan masalah ToS/hak cipta). Pakai buat konten yang kamu punya hak aksesnya.
