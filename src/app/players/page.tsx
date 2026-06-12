import Link from "next/link";
import { DataTable, PageShell } from "@/components/ui";
import { playerHref } from "@/lib/player-url";
import { getPlayers } from "@/lib/services/players";

export const dynamic = "force-dynamic";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { seasonYears, players } = await getPlayers(q);

  return (
    <PageShell
      title="Players"
      subtitle={q ? `Results for "${q}"` : "Fantasy player database"}
    >
      <DataTable
        headers={["Player", "Position", "NFL Team", ...seasonYears.map(String)]}
        rows={players.map((player) => [
          <Link key={player.id} href={playerHref(player.espnPlayerId)} className="text-emerald-300 hover:underline">
            {player.name}
          </Link>,
          player.position,
          player.nflTeam ?? "—",
          ...seasonYears.map((year) => {
            const points = player.seasonPoints[year] ?? 0;
            return points > 0 ? points.toFixed(1) : "—";
          }),
        ])}
      />
    </PageShell>
  );
}
