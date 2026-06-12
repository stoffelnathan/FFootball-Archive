import Link from "next/link";
import { Card, StatGrid } from "@/components/ui";
import { positionStyle } from "@/lib/position-colors";
import { playerHref } from "@/lib/player-url";
import { partitionRoster } from "@/lib/roster-order";
import { formatRecord } from "@/lib/types";

type RosterEntry = {
  id: string;
  starter: boolean;
  lineupSlot: string;
  seasonPoints: number;
  player: {
    id: string;
    name: string;
    position: string;
    nflTeam: string | null;
    espnPlayerId: number;
  };
};

function RosterSection({
  title,
  subtitle,
  roster,
}: {
  title: string;
  subtitle: string;
  roster: RosterEntry[];
}) {
  const { starters, bench } = partitionRoster(roster);

  return (
    <Card title={title}>
      <p className="mb-4 text-sm text-zinc-500">{subtitle}</p>
      {roster.length === 0 ? (
        <p className="text-zinc-500">No roster data available.</p>
      ) : (
        <div className="space-y-6">
          <RosterGroup label="Starters" entries={starters} />
          {bench.length > 0 ? (
            <RosterGroup label="Bench" entries={bench} />
          ) : null}
        </div>
      )}
    </Card>
  );
}

function RosterGroup({
  label,
  entries,
}: {
  label: string;
  entries: RosterEntry[];
}) {
  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm uppercase tracking-wide text-zinc-500">{label}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`rounded-xl border p-3 ${positionStyle(entry.player.position)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide opacity-80">
                  {entry.lineupSlot}
                </p>
                <Link
                  href={playerHref(entry.player.espnPlayerId)}
                  className="mt-1 block text-sm font-semibold hover:underline"
                >
                  {entry.player.name}
                </Link>
                <p className="mt-1 text-xs opacity-80">
                  {entry.player.position}
                  {entry.player.nflTeam ? ` · ${entry.player.nflTeam}` : ""}
                </p>
              </div>
              <p className="text-right text-xs opacity-80">
                {entry.seasonPoints.toFixed(1)} pts
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OwnerSeasonRosters({
  openingWeekNumber,
  closingWeekNumber,
  openingRoster,
  closingRoster,
}: {
  openingWeekNumber: number | null;
  closingWeekNumber: number | null;
  openingRoster: RosterEntry[];
  closingRoster: RosterEntry[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <RosterSection
        title="After Draft"
        subtitle={
          openingWeekNumber
            ? `Opening roster from Week ${openingWeekNumber}`
            : "Opening roster"
        }
        roster={openingRoster}
      />
      <RosterSection
        title="End of Season"
        subtitle={
          closingWeekNumber
            ? `Final roster from Week ${closingWeekNumber}`
            : "Final roster"
        }
        roster={closingRoster}
      />
    </div>
  );
}

export function OwnerSeasonStats({
  wins,
  losses,
  ties,
  pointsFor,
  pointsAgainst,
  playoffSeed,
}: {
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  playoffSeed: number | null;
}) {
  return (
    <StatGrid
      items={[
        { label: "Record", value: formatRecord(wins, losses, ties) },
        { label: "Points For", value: pointsFor.toFixed(2) },
        { label: "Points Against", value: pointsAgainst.toFixed(2) },
        { label: "Playoff Seed", value: playoffSeed ? String(playoffSeed) : "—" },
      ]}
    />
  );
}
