export const OFFENSE_POSITIONS = ["QB", "RB", "WR", "TE"] as const;

export const PLAYER_POSITION_FILTERS = [
  { id: "OFFENSE", label: "Offense" },
  { id: "QB", label: "QB" },
  { id: "RB", label: "RB" },
  { id: "WR", label: "WR" },
  { id: "TE", label: "TE" },
  { id: "K", label: "K" },
  { id: "D/ST", label: "D/ST" },
] as const;

export type PlayerPositionFilterId =
  (typeof PLAYER_POSITION_FILTERS)[number]["id"];

export function positionsForFilter(
  filter: PlayerPositionFilterId,
): string[] | null {
  if (filter === "OFFENSE") return [...OFFENSE_POSITIONS];
  return [filter];
}

export function formatPosRank(position: string, rank: number | null): string {
  if (!rank) return "—";
  return `${position}${rank}`;
}

export function buildPosRanks(
  players: Array<{ id: string; position: string; points: number }>,
): Map<string, number> {
  const byPosition = new Map<string, Array<{ id: string; points: number }>>();

  for (const player of players) {
    if (player.points <= 0) continue;
    const group = byPosition.get(player.position) ?? [];
    group.push({ id: player.id, points: player.points });
    byPosition.set(player.position, group);
  }

  const ranks = new Map<string, number>();

  for (const group of byPosition.values()) {
    group.sort((a, b) => b.points - a.points);
    let rank = 0;
    let lastPoints: number | null = null;

    for (const entry of group) {
      if (lastPoints == null || entry.points < lastPoints) {
        rank += 1;
        lastPoints = entry.points;
      }
      ranks.set(entry.id, rank);
    }
  }

  return ranks;
}
