import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, DataTable, PageShell } from "@/components/ui";
import { matchupLabel, teamCardTitle } from "@/lib/format";
import { playerHref } from "@/lib/player-url";
import { getMatchupById } from "@/lib/services/matchups";

function RosterTable({
  team,
  score,
  roster,
}: {
  team: { teamName: string; owner: { displayName: string } };
  score: number;
  roster: Array<{
    id: string;
    starter: boolean;
    lineupSlot: string;
    fantasyPoints: number;
    player: { id: string; name: string; position: string; espnPlayerId: number };
  }>;
}) {
  const starters = roster.filter((entry) => entry.starter);
  const bench = roster.filter((entry) => !entry.starter);

  return (
    <Card title={teamCardTitle(team, score)}>
      <h3 className="mb-2 text-sm uppercase tracking-wide text-zinc-500">
        Starters
      </h3>
      <DataTable
        headers={["Slot", "Player", "Pts"]}
        rows={starters.map((entry) => [
          entry.lineupSlot,
          <Link key={entry.id} href={playerHref(entry.player.espnPlayerId)} className="text-emerald-300 hover:underline">
            {entry.player.name}
          </Link>,
          entry.fantasyPoints.toFixed(2),
        ])}
      />
      {bench.length > 0 ? (
        <>
          <h3 className="mb-2 mt-6 text-sm uppercase tracking-wide text-zinc-500">
            Bench
          </h3>
          <DataTable
            headers={["Slot", "Player", "Pts"]}
            rows={bench.map((entry) => [
              entry.lineupSlot,
              entry.player.name,
              entry.fantasyPoints.toFixed(2),
            ])}
          />
        </>
      ) : null}
    </Card>
  );
}

export default async function MatchupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getMatchupById(id);
  if (!data) notFound();

  const { matchup, homeRoster, awayRoster } = data;

  return (
    <PageShell
      title={`Week ${matchup.week.weekNumber}, ${matchup.week.season.year}`}
      subtitle={matchupLabel(matchup.homeTeam, matchup.awayTeam)}
    >
      <Link
        href={`/seasons/${matchup.week.season.year}/weeks/${matchup.week.weekNumber}`}
        className="mb-6 inline-block text-sm text-zinc-400 hover:text-emerald-300"
      >
        ← Back to week
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        <RosterTable
          team={matchup.homeTeam}
          score={matchup.homeScore}
          roster={homeRoster}
        />
        <RosterTable
          team={matchup.awayTeam}
          score={matchup.awayScore}
          roster={awayRoster}
        />
      </div>
    </PageShell>
  );
}
