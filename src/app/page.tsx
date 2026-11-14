import Link from "next/link";

const FEATURES = [
  {
    href: "/novel",
    icon: "📚",
    title: "Light Novel",
    desc: "Tempel teks atau upload .txt/.epub. Terjemahan muncul bertahap, bisa diedit, terus diunduh.",
  },
  {
    href: "/manga",
    icon: "🖼️",
    title: "Manga / Manhwa",
    desc: "Upload halaman. AI baca teks di balon, nerjemahin, lalu nempel hasilnya balik ke gambar.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Auto<span className="text-orange-500">TL</span>
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
        Terjemahin light novel &amp; manga ke Bahasa Indonesia yang santai, nggak kaku kayak buku pelajaran. Pilih Gemini, OpenAI, Claude, 9Router, atau provider lainnya.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="group rounded-2xl border border-zinc-200 p-6 transition hover:border-orange-500 hover:shadow-lg dark:border-zinc-800"
          >
            <div className="text-3xl">{f.icon}</div>
            <h2 className="mt-3 text-xl font-semibold group-hover:text-orange-500">{f.title} →</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{f.desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-xl bg-zinc-100 p-4 text-sm dark:bg-zinc-900">
        <p className="font-semibold">Contoh gaya terjemahan:</p>
        <p className="mt-2 text-zinc-500">「べ、別にあんたのために作ったんじゃないんだからね！」</p>
        <p className="mt-1">&quot;B-bukan berarti aku bikinin ini buat kamu, tahu!&quot;</p>
      </div>
    </main>
  );
}
