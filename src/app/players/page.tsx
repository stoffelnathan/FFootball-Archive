import Link from "next/link";
import { Suspense } from "react";
import { DataTable, PageShell } from "@/components/ui";
import { PlayersPositionFilter } from "@/components/PlayersPositionFilter";
import {
  PLAYER_POSITION_FILTERS,
  type PlayerPositionFilterId,
} from "@/lib/player-positions";
import { playerHref } from "@/lib/player-url";
import { getPlayerDirectory } from "@/lib/services/players";

export const dynamic = "force-dynamic";

function parsePositionFilter(value?: string): PlayerPositionFilterId {
  const match = PLAYER_POSITION_FILTERS.find((filter) => filter.id === value);
  return match?.id ?? "OFFENSE";
}

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pos?: string }>;
}) {
  const { q, pos } = await searchParams;
  const position = parsePositionFilter(pos);
  const { latestSeasonYear, players, positionFilter } = await getPlayerDirectory({
    search: q,
    position,
  });

  const filterLabel =
    PLAYER_POSITION_FILTERS.find((filter) => filter.id === positionFilter)?.label ??
    "Offense";

  return (
    <PageShell
      title="Players"
      subtitle={
        q
          ? `Results for "${q}"`
          : `${filterLabel} rankings by ${latestSeasonYear} fantasy points`
      }
    >
      <div className="mb-6 space-y-4">
        <Suspense fallback={null}>
          <PlayersPositionFilter />
        </Suspense>
      </div>

      {players.length === 0 ? (
        <p className="text-zinc-500">No players found for this filter.</p>
      ) : (
        <DataTable
          headers={[
            "Rank",
            "Player",
            "Pos",
            "Pos Rank",
            `${latestSeasonYear} Pts`,
            "NFL Team",
          ]}
          rows={players.map((player, index) => [
            index + 1,
            <Link
              key={player.id}
              href={playerHref(player.espnPlayerId)}
              className="text-emerald-300 hover:underline"
            >
              {player.name}
            </Link>,
            player.position,
            player.posRankLabel,
            player.points.toFixed(1),
            player.nflTeam ?? "—",
          ])}
        />
      )}
    </PageShell>
  );
}
