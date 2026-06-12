import Link from "next/link";
import { Card, PageShell } from "@/components/ui";
import { ownerLabel } from "@/lib/format";
import { playerHref } from "@/lib/player-url";
import { searchAll } from "@/lib/services/awards";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const results = q ? await searchAll(q) : null;

  return (
    <PageShell
      title="Search"
      subtitle={q ? `Results for "${q}"` : "Search players, owners, seasons, and teams"}
    >
      {!q ? (
        <p className="text-zinc-400">Use the search bar above to find anything in the archive.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Players">
            <div className="space-y-2">
              {results?.players.length ? (
                results.players.map((player) => (
                  <Link key={player.id} href={playerHref(player.espnPlayerId)} className="block hover:text-emerald-300">
                    {player.name} ({player.position})
                  </Link>
                ))
              ) : (
                <p className="text-zinc-500">No players found</p>
              )}
            </div>
          </Card>
          <Card title="Owners">
            <div className="space-y-2">
              {results?.owners.length ? (
                results.owners.map((owner) => (
                  <Link key={owner.id} href={`/owners/${owner.id}`} className="block hover:text-emerald-300">
                    {owner.displayName}
                  </Link>
                ))
              ) : (
                <p className="text-zinc-500">No owners found</p>
              )}
            </div>
          </Card>
          <Card title="Seasons">
            <div className="space-y-2">
              {results?.seasons.length ? (
                results.seasons.map((season) => (
                  <Link key={season.id} href={`/seasons/${season.year}`} className="block hover:text-emerald-300">
                    {season.year}
                  </Link>
                ))
              ) : (
                <p className="text-zinc-500">No seasons found</p>
              )}
            </div>
          </Card>
          <Card title="Teams">
            <div className="space-y-2">
              {results?.teams.length ? (
                results.teams.map((team) => (
                  <div key={team.id}>
                    <Link href={`/owners/${team.ownerId}`} className="hover:text-emerald-300">
                      {ownerLabel(team.owner)}
                    </Link>
                    <span className="text-zinc-500">
                      {" "}
                      ({team.teamName}, {team.season.year})
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-zinc-500">No teams found</p>
              )}
            </div>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
