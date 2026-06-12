import Link from "next/link";
import { Card, PageShell, StatGrid } from "@/components/ui";
import { getHomepageData, getLeagueRecords } from "@/lib/services/seasons";
import { formatRecord } from "@/lib/types";

function ownerLinks(owners: Array<{ ownerId: string; displayName: string }>) {
  return owners.map((owner) => ({
    label: owner.displayName,
    href: `/owners/${owner.ownerId}`,
  }));
}

export default async function HomePage() {
  const [home, records] = await Promise.all([
    getHomepageData(),
    getLeagueRecords(),
  ]);

  const { highlights } = home;
  const titleCount = highlights.championshipLeaders[0]?.championships ?? 0;
  const winCount = highlights.winsLeaders[0]?.wins ?? 0;
  const streakCount = highlights.streakLeaders[0]?.streak ?? 0;
  const topScore = highlights.highestScore?.score;

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
              value:
                highlights.championshipLeaders[0]?.displayName ?? "—",
              detail:
                titleCount > 0
                  ? `${titleCount} title${titleCount === 1 ? "" : "s"}${highlights.championshipLeaders.length > 1 ? " each" : ""}`
                  : undefined,
              links:
                highlights.championshipLeaders.length > 0
                  ? ownerLinks(highlights.championshipLeaders)
                  : undefined,
            },
            {
              label: "Career Wins Leader",
              value: highlights.winsLeaders[0]?.displayName ?? "—",
              detail:
                winCount > 0
                  ? `${winCount} win${winCount === 1 ? "" : "s"}${highlights.winsLeaders.length > 1 ? " each" : ""}`
                  : undefined,
              links:
                highlights.winsLeaders.length > 0
                  ? ownerLinks(highlights.winsLeaders)
                  : undefined,
            },
            {
              label: "Highest Weekly Score",
              value: topScore != null ? topScore.toFixed(2) : "—",
              detail:
                highlights.scoreLeaders.length > 0 && topScore != null
                  ? highlights.scoreLeaders.length === 1
                    ? `${highlights.scoreLeaders[0].ownerName}, Week ${highlights.scoreLeaders[0].weekNumber} (${highlights.scoreLeaders[0].seasonYear})`
                    : `${topScore.toFixed(2)} pts — ${highlights.scoreLeaders.map((entry) => entry.ownerName).join(", ")}`
                  : undefined,
              links:
                highlights.scoreLeaders.length > 1
                  ? highlights.scoreLeaders.map((entry) => ({
                      label: entry.ownerName,
                      href: `/owners/${entry.ownerId}`,
                    }))
                  : undefined,
              href:
                highlights.scoreLeaders.length === 1
                  ? `/owners/${highlights.scoreLeaders[0].ownerId}`
                  : undefined,
            },
            {
              label: "Longest Win Streak",
              value: streakCount > 0 ? String(streakCount) : "—",
              detail:
                highlights.streakLeaders.length > 0
                  ? highlights.streakLeaders
                      .map((entry) => entry.ownerName)
                      .join(", ")
                  : undefined,
              links:
                highlights.streakLeaders.length > 1
                  ? highlights.streakLeaders.map((entry) => ({
                      label: entry.ownerName,
                      href: `/owners/${entry.ownerId}`,
                    }))
                  : undefined,
              href:
                highlights.streakLeaders.length === 1
                  ? `/owners/${highlights.streakLeaders[0].ownerId}`
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
                {records.weekly[0]?.links?.length ? (
                  <p>
                    {records.weekly[0].links.map((link, index) => (
                      <span key={link.href}>
                        {index > 0 ? ", " : null}
                        <Link
                          href={link.href}
                          className="text-emerald-300 hover:underline"
                        >
                          {link.label}
                        </Link>
                      </span>
                    ))}
                    {": "}
                    {records.weekly[0].value}
                  </p>
                ) : (
                  <p>
                    {records.weekly[0]?.label}: {records.weekly[0]?.value}
                  </p>
                )}
                {records.weekly[0]?.detail ? (
                  <p className="text-zinc-500">{records.weekly[0].detail}</p>
                ) : null}
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
