"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PLAYER_POSITION_FILTERS } from "@/lib/player-positions";

export function PlayersPositionFilter() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("pos") ?? "OFFENSE";
  const search = searchParams.get("q");

  return (
    <div className="flex flex-wrap gap-2">
      {PLAYER_POSITION_FILTERS.map((filter) => {
        const params = new URLSearchParams();
        if (filter.id !== "OFFENSE") {
          params.set("pos", filter.id);
        }
        if (search) {
          params.set("q", search);
        }
        const href = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        const isActive = active === filter.id;

        return (
          <Link
            key={filter.id}
            href={href}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              isActive
                ? "bg-emerald-600 text-white"
                : "border border-zinc-700 text-zinc-300 hover:border-zinc-500"
            }`}
          >
            {filter.label}
          </Link>
        );
      })}
    </div>
  );
}
