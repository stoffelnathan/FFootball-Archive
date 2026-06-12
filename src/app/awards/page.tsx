import Link from "next/link";
import { Card, PageShell } from "@/components/ui";
import { getAllAwards } from "@/lib/services/awards";

export default async function AwardsPage() {
  const allAwards = await getAllAwards();

  return (
    <PageShell title="League Awards" subtitle="Automatically generated season honors">
      <div className="space-y-10">
        {allAwards.map((season) => (
          <section key={season.year} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium">{season.year}</h2>
              <Link href={`/seasons/${season.year}`} className="text-sm text-emerald-300 hover:underline">
                Season page →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {season.awards.map((award) => (
                <Card key={`${season.year}-${award.awardType}`}>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    {award.label}
                  </p>
                  <Link href={`/owners/${award.ownerId}`} className="mt-2 block text-lg font-medium text-emerald-300 hover:underline">
                    {award.ownerName}
                  </Link>
                  {award.detail ? (
                    <p className="mt-1 text-sm text-zinc-400">{award.detail}</p>
                  ) : null}
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
