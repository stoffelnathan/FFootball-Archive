import { Card, PageShell } from "@/components/ui";
import { getLeagueRecords } from "@/lib/services/seasons";

const SECTION_LABELS = {
  weekly: ["Highest Score", "Lowest Score", "Closest Game", "Largest Blowout"],
  season: ["Most Points For", "Most Points Against", "Best Record", "Worst Record"],
  career: ["Most Championships", "Most Wins", "Best Win %", "Most Playoff Appearances"],
  draft: ["Best Draft Pick", "Biggest Bust"],
};

function RecordSection({
  title,
  labels,
  entries,
}: {
  title: string;
  labels: string[];
  entries: Array<{ label: string; value: string; detail?: string; href?: string }>;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-medium">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {entries.map((entry, index) => (
          <Card key={labels[index] ?? index}>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              {labels[index]}
            </p>
            <p className="mt-2 text-lg font-semibold">{entry.label}</p>
            <p className="text-emerald-300">{entry.value}</p>
            {entry.detail ? (
              <p className="mt-1 text-sm text-zinc-400">{entry.detail}</p>
            ) : null}
          </Card>
        ))}
      </div>
    </section>
  );
}

export default async function RecordsPage() {
  const records = await getLeagueRecords();

  return (
    <PageShell title="League Records" subtitle="All-time and single-season bests">
      <div className="space-y-10">
        <RecordSection title="Weekly Records" labels={SECTION_LABELS.weekly} entries={records.weekly} />
        <RecordSection title="Season Records" labels={SECTION_LABELS.season} entries={records.season} />
        <RecordSection title="Career Records" labels={SECTION_LABELS.career} entries={records.career} />
        <RecordSection title="Draft Records" labels={SECTION_LABELS.draft} entries={records.draft} />
      </div>
    </PageShell>
  );
}
