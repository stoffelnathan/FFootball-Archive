import Link from "next/link";
import { DataTable, PageShell } from "@/components/ui";
import { playerHref } from "@/lib/player-url";
import { getDraftPicks, getDraftSeasons } from "@/lib/services/draft";

export default async function DraftPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year } = await searchParams;
  const [seasons, picks] = await Promise.all([
    getDraftSeasons(),
    getDraftPicks(year ? Number(year) : undefined),
  ]);

  return (
    <PageShell title="Draft Archive" subtitle="Every pick in league history">
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/draft"
          className={`rounded-lg border px-3 py-2 text-sm ${!year ? "border-emerald-600 bg-emerald-600/10" : "border-zinc-800 hover:border-zinc-700"}`}
        >
          All seasons
        </Link>
        {seasons.map((season) => (
          <Link
            key={season.id}
            href={`/draft?year=${season.year}`}
            className={`rounded-lg border px-3 py-2 text-sm ${year === String(season.year) ? "border-emerald-600 bg-emerald-600/10" : "border-zinc-800 hover:border-zinc-700"}`}
          >
            {season.year}
          </Link>
        ))}
      </div>

      <DataTable
        headers={["Pick", "Round", "Player", "Owner", "Season"]}
        rows={picks.map((pick) => [
          pick.overallPick,
          pick.round,
          <Link key={pick.id} href={playerHref(pick.player.espnPlayerId)} className="text-emerald-300 hover:underline">
            {pick.player.name}
          </Link>,
          pick.team.owner.displayName,
          pick.season.year,
        ])}
      />
    </PageShell>
  );
}
