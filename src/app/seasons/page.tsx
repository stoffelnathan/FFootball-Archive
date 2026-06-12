import { Card, PageShell } from "@/components/ui";
import { getSeasonsList } from "@/lib/services/seasons";

export default async function SeasonsPage() {
  const seasons = await getSeasonsList();

  return (
    <PageShell title="Season Archive" subtitle="Every season in league history">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {seasons.map((season) => (
          <Card key={season.id} href={`/seasons/${season.year}`}>
            <p className="text-3xl font-semibold">{season.year}</p>
            <p className="mt-2 text-zinc-400">
              Champion: {season.champion?.displayName ?? "TBD"}
            </p>
            <p className="text-sm text-zinc-500">
              Runner-up: {season.runnerUp?.displayName ?? "—"}
            </p>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
