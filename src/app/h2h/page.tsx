import Link from "next/link";
import { Card, DataTable, PageShell } from "@/components/ui";
import { getHeadToHead } from "@/lib/services/awards";
import { getOwners } from "@/lib/services/owners";

export default async function HeadToHeadPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  const owners = await getOwners();
  const h2h = a && b ? await getHeadToHead(a, b) : null;
  const ownerA = owners.find((owner) => owner.ownerId === a);
  const ownerB = owners.find((owner) => owner.ownerId === b);

  return (
    <PageShell title="Head-to-Head" subtitle="Compare any two owners">
      <form method="GET" action="/h2h" className="mb-8 grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:grid-cols-[1fr_1fr_auto]">
        <label className="space-y-2 text-sm">
          <span className="text-zinc-400">Owner A</span>
          <select
            name="a"
            defaultValue={a ?? ""}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
          >
            <option value="">Select owner</option>
            {owners.map((owner) => (
              <option key={owner.ownerId} value={owner.ownerId}>
                {owner.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-zinc-400">Owner B</span>
          <select
            name="b"
            defaultValue={b ?? ""}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
          >
            <option value="">Select owner</option>
            {owners.map((owner) => (
              <option key={owner.ownerId} value={owner.ownerId}>
                {owner.displayName}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="self-end rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500"
        >
          Compare
        </button>
      </form>

      {h2h && ownerA && ownerB ? (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <p className="text-xs uppercase tracking-wide text-zinc-500">Overall</p>
              <p className="mt-2 text-2xl font-semibold">{h2h.overall.record}</p>
              <p className="text-sm text-zinc-400">
                {ownerA.displayName} vs {ownerB.displayName}
              </p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-wide text-zinc-500">Playoffs</p>
              <p className="mt-2 text-2xl font-semibold">{h2h.playoff.record}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-wide text-zinc-500">Avg Score</p>
              <p className="mt-2 text-lg font-semibold">
                {h2h.averageScore.a.toFixed(2)} / {h2h.averageScore.b.toFixed(2)}
              </p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-wide text-zinc-500">Biggest Victory</p>
              <p className="mt-2 text-2xl font-semibold">{h2h.biggestVictory.toFixed(2)}</p>
            </Card>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-medium">Matchup History</h2>
            <DataTable
              headers={["Season", "Week", "Score", "Winner"]}
              rows={h2h.history.map((game) => [
                game.seasonYear,
                `${game.weekNumber}${game.isPlayoff ? " (P)" : ""}`,
                `${game.aScore.toFixed(2)} - ${game.bScore.toFixed(2)}`,
                game.winner === "A"
                  ? ownerA.displayName
                  : game.winner === "B"
                    ? ownerB.displayName
                    : "Tie",
              ])}
            />
          </section>
        </div>
      ) : (
        <p className="text-zinc-400">Select two owners to compare their all-time matchups.</p>
      )}
    </PageShell>
  );
}
