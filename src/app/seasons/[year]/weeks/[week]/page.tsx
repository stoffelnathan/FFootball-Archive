import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageShell } from "@/components/ui";
import { ownerLabel } from "@/lib/format";
import { getSeasonByYear } from "@/lib/services/seasons";

export default async function WeekPage({
  params,
}: {
  params: Promise<{ year: string; week: string }>;
}) {
  const { year, week } = await params;
  const season = await getSeasonByYear(Number(year));
  if (!season) notFound();

  const weekData = season.weeks.find(
    (entry) => entry.weekNumber === Number(week),
  );
  if (!weekData) notFound();

  return (
    <PageShell
      title={`${year} — Week ${week}`}
      subtitle={weekData.isPlayoff ? "Playoffs" : "Regular season"}
    >
      <Link
        href={`/seasons/${year}`}
        className="mb-6 inline-block text-sm text-zinc-400 hover:text-emerald-300"
      >
        ← Back to {year} season
      </Link>

      <div className="space-y-4">
        {weekData.matchups.map((matchup) => {
          const homeWon = matchup.homeScore > matchup.awayScore;
          const awayWon = matchup.awayScore > matchup.homeScore;
          const margin = Math.abs(matchup.homeScore - matchup.awayScore).toFixed(2);

          return (
            <Card key={matchup.id} href={`/matchups/${matchup.id}`}>
              <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className={homeWon ? "font-semibold text-emerald-300" : ""}>
                  <Link href={`/owners/${matchup.homeTeam.ownerId}`} className="hover:underline">
                    {ownerLabel(matchup.homeTeam.owner)}
                  </Link>
                  <p className="text-sm text-zinc-500">{matchup.homeTeam.teamName}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold">
                    {matchup.homeScore.toFixed(2)} - {matchup.awayScore.toFixed(2)}
                  </p>
                  <p className="text-sm text-zinc-500">Margin: {margin}</p>
                </div>
                <div className={`text-right ${awayWon ? "font-semibold text-emerald-300" : ""}`}>
                  <Link href={`/owners/${matchup.awayTeam.ownerId}`} className="hover:underline">
                    {ownerLabel(matchup.awayTeam.owner)}
                  </Link>
                  <p className="text-sm text-zinc-500">{matchup.awayTeam.teamName}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}
