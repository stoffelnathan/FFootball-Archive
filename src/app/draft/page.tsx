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
    <PageShell
      title="Draft Archive"
      subtitle={`${selectedYear} draft board`}
      wide
      className="lg:flex lg:min-h-[calc(100dvh-4.5rem)] lg:flex-col lg:py-6"
    >
      <div className="mb-4 shrink-0 lg:mb-3">
        <Link
          href="/draft/mock"
          className="mb-3 inline-flex rounded-lg border border-emerald-700/60 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-300 transition hover:border-emerald-600"
        >
          Mock draft for our league settings →
        </Link>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-webkit-overflow-scrolling:touch]">
          {seasons.map((season) => (
            <Link
              key={season.id}
              href={`/draft?year=${season.year}`}
              className={`shrink-0 rounded-lg border px-3 py-2 text-sm ${selectedYear === season.year ? "border-emerald-600 bg-emerald-600/10" : "border-zinc-800 hover:border-zinc-700"}`}
            >
              {season.year}
            </Link>
          ))}
        </div>
      </div>

      <DraftBoard columns={board.columns} rounds={board.rounds} />
    </PageShell>
  );
}
