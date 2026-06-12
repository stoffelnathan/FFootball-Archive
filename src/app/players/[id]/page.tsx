import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, PageShell } from "@/components/ui";
import { PlayerSeasonPanel } from "@/components/PlayerSeasonPanel";
import { ownerLabel } from "@/lib/format";
import { isEspnPlayerId, playerHref } from "@/lib/player-url";
import { getPlayerById } from "@/lib/services/players";

export const dynamic = "force-dynamic";

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getPlayerById(id);
  if (!data) notFound();

  if (!isEspnPlayerId(id)) {
    redirect(playerHref(data.player.espnPlayerId));
  }

  const { player, seasons, dataBySeason } = data;

  return (
    <PageShell
      title={player.name}
      subtitle={`${player.position}${player.nflTeam ? ` · ${player.nflTeam}` : ""}`}
    >
      <PlayerSeasonPanel
        seasons={seasons}
        dataBySeason={dataBySeason}
        position={player.position}
      />

      {player.draftPicks.length > 0 ? (
        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-medium">Draft History</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {player.draftPicks.map((pick) => (
              <Card key={pick.id}>
                <p className="text-sm text-zinc-400">{pick.season.year} season</p>
                <p className="mt-1 font-medium">
                  Round {pick.round}, Pick {pick.overallPick}
                </p>
                <p className="text-sm text-zinc-500">
                  {ownerLabel(pick.team.owner)}
                </p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
