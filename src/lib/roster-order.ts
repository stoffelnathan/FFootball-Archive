const SLOT_ORDER: Record<string, number> = {
  QB: 0,
  TQB: 0,
  RB: 1,
  WR: 2,
  TE: 3,
  FLEX: 4,
  "RB/WR": 4,
  "WR/TE": 4,
  OP: 4,
  SUPER_FLEX: 4,
  K: 5,
  "D/ST": 6,
  Bench: 7,
  IR: 8,
};

function rosterSortKey(lineupSlot: string, starter: boolean): number {
  const slotRank = SLOT_ORDER[lineupSlot] ?? 9;
  const starterRank = starter ? 0 : 1;
  return starterRank * 100 + slotRank;
}

export function sortRosterByLineup<
  T extends { lineupSlot: string; starter: boolean },
>(entries: T[]): T[] {
  return [...entries].sort(
    (a, b) =>
      rosterSortKey(a.lineupSlot, a.starter) -
        rosterSortKey(b.lineupSlot, b.starter) ||
      a.lineupSlot.localeCompare(b.lineupSlot),
  );
}

export function partitionRoster<
  T extends { lineupSlot: string; starter: boolean },
>(entries: T[]) {
  const sorted = sortRosterByLineup(entries);
  const starters = sorted.filter((entry) => entry.starter);
  const bench = sorted.filter((entry) => !entry.starter);
  return { starters, bench };
}
