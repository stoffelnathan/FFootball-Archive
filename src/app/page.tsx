import Link from "next/link";
import { Card, PageShell, StatGrid } from "@/components/ui";
import { getHomepageData } from "@/lib/services/seasons";
import { getLeagueRecords } from "@/lib/services/seasons";
import { formatRecord } from "@/lib/types";

export default async function HomePage() {
  const [home, records] = await Promise.all([
    getHomepageData(),
    getLeagueRecords(),
  ]);

  return (
    <PageShell
      title={home.leagueName}
      subtitle="Permanent league history, stats, and archives"
    >
      <div className="space-y-10">
        <StatGrid
          items={[
            {
              label: "Most Championships",
              value: home.highlights.mostChampionships?.displayName ?? "—",
              detail: `${home.highlights.mostChampionships?.championships ?? 0} titles`,
              href: home.highlights.mostChampionships
                ? `/owners/${home.highlights.mostChampionships.ownerId}`
                : undefined,
            },
            {
              label: "Career Wins Leader",
              value: home.highlights.careerWinsLeader?.displayName ?? "—",
              detail: `${home.highlights.careerWinsLeader?.wins ?? 0} wins`,
              href: home.highlights.careerWinsLeader
                ? `/owners/${home.highlights.careerWinsLeader.ownerId}`
                : undefined,
            },
            {
              label: "Highest Weekly Score",
              value: home.highlights.highestScore
                ? home.highlights.highestScore.score.toFixed(2)
                : "—",
              detail: home.highlights.highestScore
                ? `${home.highlights.highestScore.ownerName}, Week ${home.highlights.highestScore.weekNumber} (${home.highlights.highestScore.seasonYear})`
                : undefined,
            },
            {
              label: "Longest Win Streak",
              value: home.highlights.longestStreak
                ? String(home.highlights.longestStreak.streak)
                : "—",
              detail: home.highlights.longestStreak?.ownerName,
              href: home.highlights.longestStreak
                ? `/owners/${home.highlights.longestStreak.ownerId}`
                : undefined,
            },
          ]}
        />

        <section className="grid gap-6 lg:grid-cols-2">
          <Card title="Champion Timeline">
            <div className="space-y-3">
              {home.championTimeline.map((entry) => (
                <div
                  key={entry.year}
                  className="flex items-center justify-between border-b border-zinc-800 pb-2 last:border-0"
                >
                  <span className="text-zinc-400">{entry.year}</span>
                  <Link
                    href={`/owners/${entry.championId}`}
                    className="font-medium text-emerald-300 hover:underline"
                  >
                    {entry.champion}
                  </Link>
                </div>
              ))}
            </div>
          </Card>

          <Card title="League Records">
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-zinc-500">Highest weekly score</p>
                <p>{records.weekly[0]?.label}: {records.weekly[0]?.value}</p>
              </div>
              <div>
                <p className="text-zinc-500">Largest blowout</p>
                <p>{records.weekly[3]?.detail ?? records.weekly[3]?.value}</p>
              </div>
              <div>
                <p className="text-zinc-500">Most points (season)</p>
                <p>{records.season[0]?.label}: {records.season[0]?.value}</p>
              </div>
              <Link href="/records" className="inline-block text-emerald-300 hover:underline">
                View all records →
              </Link>
            </div>
          </Card>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-medium">Seasons</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {home.seasons.map((season) => (
              <Card key={season.id} href={`/seasons/${season.year}`}>
                <p className="text-3xl font-semibold">{season.year}</p>
                <p className="mt-2 text-zinc-400">
                  Champion: {season.champion?.displayName ?? "TBD"}
                </p>
                <p className="text-sm text-zinc-500">
                  {season.teams.length} teams
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-medium">Career Wins Leaderboard</h2>
          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-900 text-left text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Record</th>
                  <th className="px-4 py-3">Titles</th>
                  <th className="px-4 py-3">PF</th>
                </tr>
              </thead>
              <tbody>
                {home.careerLeaderboard.map((owner) => (
                  <tr key={owner.ownerId} className="border-t border-zinc-800">
                    <td className="px-4 py-3">
                      <Link
                        href={`/owners/${owner.ownerId}`}
                        className="text-emerald-300 hover:underline"
                      >
                        {owner.displayName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {formatRecord(owner.wins, owner.losses, owner.ties)}
                    </td>
                    <td className="px-4 py-3">{owner.championships}</td>
                    <td className="px-4 py-3">{owner.pointsFor.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
