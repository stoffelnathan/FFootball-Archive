import Link from "next/link";
import { getLeagueName } from "@/lib/services/league";
import { SearchBar } from "./SearchBar";

const links = [
  { href: "/", label: "Home" },
  { href: "/seasons", label: "Seasons" },
  { href: "/owners", label: "Owners" },
  { href: "/players", label: "Players" },
  { href: "/draft", label: "Draft" },
  { href: "/records", label: "Records" },
  { href: "/awards", label: "Awards" },
  { href: "/h2h", label: "Head-to-Head" },
  { href: "/analytics", label: "Analytics" },
];

export async function SiteHeader() {
  const leagueName = await getLeagueName();

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link href="/" className="text-lg font-semibold text-zinc-100">
            {leagueName}
          </Link>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
            Fantasy Archive
          </p>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm text-zinc-400">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-emerald-300"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <SearchBar />
      </div>
    </header>
  );
}
