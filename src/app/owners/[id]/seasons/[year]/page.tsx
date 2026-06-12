import Link from "next/link";
import { notFound } from "next/navigation";
import {
  OwnerSeasonRosters,
  OwnerSeasonStats,
} from "@/components/OwnerSeasonRosters";
import { PageShell } from "@/components/ui";
import { getOwnerSeasonProfile } from "@/lib/services/owners";

export const dynamic = "force-dynamic";

export default async function OwnerSeasonPage({
  params,
}: {
  params: Promise<{ id: string; year: string }>;
}) {
  const { id, year } = await params;
  const seasonYear = Number(year);
  if (!Number.isFinite(seasonYear)) notFound();

  const profile = await getOwnerSeasonProfile(id, seasonYear);
  if (!profile) notFound();

  const { owner, team, openingWeek, closingWeek, openingRoster, closingRoster } =
    profile;

  return (
    <PageShell
      title={`${owner.displayName} · ${seasonYear}`}
      subtitle={team.teamName}
    >
      <Link
        href={`/owners/${owner.id}`}
        className="mb-6 inline-block text-sm text-zinc-400 hover:text-emerald-300"
      >
        ← Back to {owner.displayName}
      </Link>

      <OwnerSeasonStats
        wins={team.wins}
        losses={team.losses}
        ties={team.ties}
        pointsFor={team.pointsFor}
        pointsAgainst={team.pointsAgainst}
        playoffSeed={team.playoffSeed}
      />

      <section className="mt-8">
        <OwnerSeasonRosters
          openingWeekNumber={openingWeek?.weekNumber ?? null}
          closingWeekNumber={closingWeek?.weekNumber ?? null}
          openingRoster={openingRoster}
          closingRoster={closingRoster}
        />
      </section>
    </PageShell>
  );
}
