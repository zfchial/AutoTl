import Link from "next/link";

const LINKS = [
  { href: "/novel", label: "📚 Light Novel" },
  { href: "/manga", label: "🖼️ Manga" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Auto<span className="text-orange-500">TL</span>
        </Link>
        <div className="flex gap-1 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
