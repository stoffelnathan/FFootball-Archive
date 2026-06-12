import Link from "next/link";
import { Card, DataTable, PageShell } from "@/components/ui";
import { getAnalytics } from "@/lib/services/awards";
import { getOwners } from "@/lib/services/owners";

export default async function AnalyticsPage() {
  const [analytics, owners] = await Promise.all([getAnalytics(), getOwners()]);

  return (
    <PageShell title="Analytics" subtitle="League trends and performance insights">
      <div className="space-y-10">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              League Avg Weekly Score
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {analytics.weeklyAverage.toFixed(2)}
            </p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Seasons Archived
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {analytics.pointsBySeason.length}
            </p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Active Owners
            </p>
            <p className="mt-2 text-3xl font-semibold">{owners.length}</p>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">Points by Season</h2>
          <DataTable
            headers={["Season", "Avg Team PF", "Total League PF"]}
            rows={analytics.pointsBySeason.map((entry) => [
              entry.year,
              entry.avgPointsFor.toFixed(2),
              entry.totalPoints.toFixed(2),
            ])}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">Championship Timeline</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {analytics.championshipTimeline.map((entry) => (
              <Card key={entry.year}>
                <p className="text-zinc-400">{entry.year}</p>
                <Link href={`/owners/${entry.championId}`} className="mt-1 block font-medium text-emerald-300 hover:underline">
                  {entry.championName}
                </Link>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium">Career Win Percentage</h2>
          <DataTable
            headers={["Owner", "Seasons", "Championships", "Trend"]}
            rows={analytics.careerStats
              .sort((a, b) => b.championships.length - a.championships.length)
              .map((owner) => [
                <Link key={owner.id} href={`/owners/${owner.id}`} className="text-emerald-300 hover:underline">
                  {owner.name}
                </Link>,
                owner.seasons.length,
                owner.championships.join(", ") || "—",
                owner.seasons.map((s) => s.pointsFor.toFixed(0)).join(" → "),
              ])}
          />
        </section>
      </div>
    </PageShell>
  );
}
