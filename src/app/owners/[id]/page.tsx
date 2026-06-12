import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, DataTable, PageShell, StatGrid } from "@/components/ui";
import { getOwnerById } from "@/lib/services/owners";
import { formatRecord } from "@/lib/types";

export default async function OwnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getOwnerById(id);
  if (!data?.career) notFound();

  const { owner, career } = data;

  return (
    <PageShell title={owner.displayName} subtitle="Owner career profile">
      <StatGrid
        items={[
          {
            label: "Record",
            value: formatRecord(career.wins, career.losses, career.ties),
          },
          {
            label: "Win %",
            value: `${(career.winPercentage * 100).toFixed(1)}%`,
          },
          {
            label: "Championships",
            value: String(career.championships),
          },
          {
            label: "Runner-ups",
            value: String(career.runnerUps),
          },
          {
            label: "Points For",
            value: career.pointsFor.toFixed(2),
          },
          {
            label: "Points Against",
            value: career.pointsAgainst.toFixed(2),
          },
          {
            label: "Playoff Appearances",
            value: String(career.playoffAppearances),
          },
          {
            label: "Average Finish",
            value: career.averageFinish?.toFixed(1) ?? "—",
          },
        ]}
      />

      <section className="mt-8 space-y-4">
        <h2 className="text-xl font-medium">Season History</h2>
        <DataTable
          headers={["Season", "Team", "Record", "PF", "Seed"]}
          rows={owner.teams.map((team) => [
            <Link key={team.id} href={`/seasons/${team.season.year}`} className="text-emerald-300 hover:underline">
              {team.season.year}
            </Link>,
            team.teamName,
            formatRecord(team.wins, team.losses, team.ties),
            team.pointsFor.toFixed(2),
            team.playoffSeed ?? "—",
          ])}
        />
      </section>

      {owner.awards.length > 0 ? (
        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-medium">Awards</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {owner.awards.map((award) => (
              <Card key={award.id}>
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  {award.awardType}
                </p>
                <p className="mt-1 font-medium">{award.season.year}</p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
