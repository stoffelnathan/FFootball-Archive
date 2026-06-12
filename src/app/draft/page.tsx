import Link from "next/link";
import { redirect } from "next/navigation";
import { DraftBoard } from "@/components/DraftBoard";
import { PageShell } from "@/components/ui";
import { getDraftBoard, getDraftSeasons } from "@/lib/services/draft";

export const dynamic = "force-dynamic";

export default async function DraftPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year } = await searchParams;
  const seasons = await getDraftSeasons();
  const latestYear = seasons[0]?.year;

  if (!latestYear) {
    return (
      <PageShell title="Draft Archive" subtitle="Every pick in league history">
        <p className="text-zinc-500">No draft data available yet.</p>
      </PageShell>
    );
  }

  const selectedYear = year ? Number(year) : latestYear;
  const hasSeason = seasons.some((season) => season.year === selectedYear);

  if (!year || !hasSeason) {
    redirect(`/draft?year=${latestYear}`);
  }

  const board = await getDraftBoard(selectedYear);

  return (
    <PageShell title="Draft Archive" subtitle={`${selectedYear} draft board`} wide>
      <div className="mb-6 flex flex-wrap gap-2">
        {seasons.map((season) => (
          <Link
            key={season.id}
            href={`/draft?year=${season.year}`}
            className={`rounded-lg border px-3 py-2 text-sm ${selectedYear === season.year ? "border-emerald-600 bg-emerald-600/10" : "border-zinc-800 hover:border-zinc-700"}`}
          >
            {season.year}
          </Link>
        ))}
      </div>

      <DraftBoard columns={board.columns} rounds={board.rounds} />
    </PageShell>
  );
}
