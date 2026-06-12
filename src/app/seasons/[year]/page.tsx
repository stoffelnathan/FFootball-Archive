import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, DataTable, PageShell } from "@/components/ui";
import { getAwardsForSeason } from "@/lib/services/awards";
import { matchupLabel, ownerLabel } from "@/lib/format";
import { playerHref } from "@/lib/player-url";
import { getSeasonByYear } from "@/lib/services/seasons";
import { formatRecord } from "@/lib/types";

export default async function SeasonPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  const season = await getSeasonByYear(Number(year));
  if (!season) notFound();

  const awards = await getAwardsForSeason(season.year);
  const playoffWeeks = season.weeks.filter((week) => week.isPlayoff);

  return (
    <PageShell
      title={`${season.year} Season`}
      subtitle={season.league.name}
    >
      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <Link href="/seasons" className="text-zinc-400 hover:text-emerald-300">
          ← All seasons
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Champion">
          {season.champion ? (
            <Link href={`/owners/${season.champion.id}`} className="text-2xl font-semibold text-emerald-300 hover:underline">
              {season.champion.displayName}
            </Link>
          ) : (
            "TBD"
          )}
        </Card>
        <Card title="Runner-up">
          {season.runnerUp ? (
            <Link href={`/owners/${season.runnerUp.id}`} className="text-2xl font-semibold hover:underline">
              {season.runnerUp.displayName}
            </Link>
          ) : (
            "—"
          )}
        </Card>
      </div>

      <section className="mt-8 space-y-4">
        <h2 className="text-xl font-medium">Final Standings</h2>
        <DataTable
          headers={["Seed", "Owner", "Team", "Record", "PF", "PA"]}
          rows={season.teams
            .sort((a, b) => (a.playoffSeed ?? 99) - (b.playoffSeed ?? 99))
            .map((team) => [
              team.playoffSeed ?? "—",
              <Link key={team.id} href={`/owners/${team.ownerId}`} className="text-emerald-300 hover:underline">
                {ownerLabel(team.owner)}
              </Link>,
              team.teamName,
              formatRecord(team.wins, team.losses, team.ties),
              team.pointsFor.toFixed(2),
              team.pointsAgainst.toFixed(2),
            ])}
        />
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-xl font-medium">Weekly Matchups</h2>
        <div className="flex flex-wrap gap-2">
          {season.weeks.map((week) => (
            <Link
              key={week.id}
              href={`/seasons/${season.year}/weeks/${week.weekNumber}`}
              className="rounded-lg border border-zinc-800 px-3 py-2 text-sm hover:border-emerald-700/50"
            >
              Week {week.weekNumber}
              {week.isPlayoff ? " (P)" : ""}
            </Link>
          ))}
        </div>
      </section>

      {playoffWeeks.length > 0 ? (
        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-medium">Playoff Bracket</h2>
          <div className="space-y-4">
            {playoffWeeks.map((week) => (
              <Card key={week.id} title={`Playoff Week ${week.weekNumber}`}>
                <div className="space-y-2 text-sm">
                  {week.matchups.map((matchup) => (
                    <Link
                      key={matchup.id}
                      href={`/matchups/${matchup.id}`}
                      className="flex justify-between rounded-lg border border-zinc-800 px-3 py-2 hover:border-emerald-700/50"
                    >
                      <span>{matchupLabel(matchup.homeTeam, matchup.awayTeam)}</span>
                      <span className="text-zinc-400">
                        {matchup.homeScore.toFixed(2)} - {matchup.awayScore.toFixed(2)}
                      </span>
                    </Link>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8 space-y-4">
        <h2 className="text-xl font-medium">Awards</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {awards.map((award) => (
            <Card key={award.awardType}>
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                {award.label}
              </p>
              <Link href={`/owners/${award.ownerId}`} className="mt-1 block text-lg font-medium text-emerald-300 hover:underline">
                {award.ownerName}
              </Link>
              {award.detail ? (
                <p className="mt-1 text-sm text-zinc-400">{award.detail}</p>
              ) : null}
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium">Draft</h2>
          <Link href={`/draft?year=${season.year}`} className="text-sm text-emerald-300 hover:underline">
            Full draft →
          </Link>
        </div>
        <DataTable
          headers={["Pick", "Round", "Player", "Owner"]}
          rows={season.draftPicks.slice(0, 24).map((pick) => [
            pick.overallPick,
            pick.round,
            <Link key={pick.id} href={playerHref(pick.player.espnPlayerId)} className="text-emerald-300 hover:underline">
              {pick.player.name}
            </Link>,
            pick.team.owner.displayName,
          ])}
        />
      </section>
    </PageShell>
  );
}
