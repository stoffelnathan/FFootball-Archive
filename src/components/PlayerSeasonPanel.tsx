"use client";

import { useMemo, useState } from "react";
import { Card, DataTable } from "@/components/ui";
import {
  STAT_LABELS,
  formatStatValue,
  statOrderForPosition,
  type PlayerStatMap,
} from "@/lib/espn/player-stats";

type WeeklyLine = {
  weekNumber: number;
  weekLabel: string;
  fantasyPoints: number;
  ownerName: string;
  stats: PlayerStatMap;
};

type SeasonBundle = {
  ownerName: string;
  totals: PlayerStatMap;
  weekly: WeeklyLine[];
  posRank: number | null;
  posRankLabel: string;
};

export function PlayerSeasonPanel({
  seasons,
  dataBySeason,
  position,
}: {
  seasons: number[];
  dataBySeason: Record<number, SeasonBundle>;
  position: string;
}) {
  const [year, setYear] = useState(seasons[0] ?? new Date().getFullYear());
  const data = dataBySeason[year];
  const statOrder = useMemo(() => statOrderForPosition(position), [position]);

  if (!seasons.length || !data) {
    return (
      <p className="text-zinc-500">No season stats available for this player.</p>
    );
  }

  const statRows = statOrder
    .filter((key) => data.totals[key] != null)
    .map((key) => [
      STAT_LABELS[key] ?? key,
      formatStatValue(key, data.totals[key] ?? 0),
    ]);

  if (data.posRankLabel !== "—") {
    statRows.unshift(["Pos Rank", data.posRankLabel]);
  }

  const weeklyStatKeys = useMemo(
    () =>
      statOrder.filter(
        (key) => key !== "fantasyPoints" && key !== "games",
      ).slice(0, 5),
    [statOrder],
  );

  const weeklyHeaders = [
    "Week",
    "Owner",
    "Pts",
    ...weeklyStatKeys.map((key) => STAT_LABELS[key] ?? key),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="player-season" className="text-sm text-zinc-400">
          Season
        </label>
        <select
          id="player-season"
          value={year}
          onChange={(event) => setYear(Number(event.target.value))}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        >
          {seasons.map((seasonYear) => (
            <option key={seasonYear} value={seasonYear}>
              {seasonYear}
            </option>
          ))}
        </select>
        <span className="text-sm text-zinc-500">
          Rostered by {data.ownerName}
        </span>
        {data.posRankLabel !== "—" ? (
          <span className="text-sm text-emerald-300">{data.posRankLabel}</span>
        ) : null}
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-medium">{year} Season Stats</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {statRows.map(([label, value]) => (
            <Card key={String(label)}>
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                {label}
              </p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-medium">{year} Weekly Log</h2>
        <DataTable
          headers={weeklyHeaders}
          rows={data.weekly.map((line) => [
            line.weekLabel,
            line.ownerName,
            line.fantasyPoints.toFixed(2),
            ...weeklyStatKeys.map((key) =>
              line.stats[key] != null
                ? formatStatValue(key, line.stats[key])
                : "—",
            ),
          ])}
        />
      </section>
    </div>
  );
}
