import {
  LEAGUE_ROSTER,
  MOCK_DRAFT,
  SKILL_POSITIONS,
  type SkillPosition,
} from "@/lib/league-settings";
import { formatPosRank } from "@/lib/player-positions";
import type { MockDraftPlayer } from "@/lib/mock-draft/types";

type RawPlayer = {
  id: string;
  espnPlayerId: number;
  name: string;
  position: string;
  nflTeam: string | null;
  leaguePoints: number;
  receptions: number;
};

/**
 * Approximate replacement-level rank by position for a 12-team league with
 * 1 QB / 2 RB / 2 WR / 1 TE / 2 FLEX. Flex demand is split across RB/WR/TE.
 */
const REPLACEMENT_RANK: Record<SkillPosition, number> = {
  QB: 14,
  RB: 30,
  WR: 32,
  TE: 15,
};

function isSkillPosition(position: string): position is SkillPosition {
  return SKILL_POSITIONS.includes(position as SkillPosition);
}

/**
 * Apply TE premium bonus when ranking from standard ESPN PPR totals.
 * League-imported points already include TE premium; this is a small safety
 * bump when reception data suggests under-weighting.
 */
function adjustLeaguePoints(player: RawPlayer): number {
  let points = player.leaguePoints;
  if (player.position === "TE" && player.receptions > 0) {
    points += player.receptions * MOCK_DRAFT.tePremiumPprBonus * 0.15;
  }
  if (player.position === "QB") {
    points *= MOCK_DRAFT.qbValueMultiplier;
  }
  return points;
}

function replacementLevel(
  sortedByPosition: Map<SkillPosition, number[]>,
  position: SkillPosition,
): number {
  const values = sortedByPosition.get(position) ?? [];
  const index = Math.min(REPLACEMENT_RANK[position], values.length) - 1;
  if (index < 0 || values.length === 0) return 0;
  return values[Math.max(0, index)] ?? 0;
}

export function buildMockDraftRankings(rawPlayers: RawPlayer[]): MockDraftPlayer[] {
  const skillPlayers = rawPlayers.filter((player) =>
    isSkillPosition(player.position),
  );

  const adjusted = skillPlayers.map((player) => ({
    ...player,
    position: player.position as SkillPosition,
    adjustedPoints: adjustLeaguePoints(player),
  }));

  const byPosition = new Map<SkillPosition, number[]>();
  for (const position of SKILL_POSITIONS) {
    const values = adjusted
      .filter((player) => player.position === position)
      .map((player) => player.adjustedPoints)
      .sort((a, b) => b - a);
    byPosition.set(position, values);
  }

  const replacement = Object.fromEntries(
    SKILL_POSITIONS.map((position) => [
      position,
      replacementLevel(byPosition, position),
    ]),
  ) as Record<SkillPosition, number>;

  const posGroups = new Map<SkillPosition, MockDraftPlayer[]>();

  for (const player of adjusted) {
    const draftValue = player.adjustedPoints - replacement[player.position];
    const entry: MockDraftPlayer = {
      id: player.id,
      espnPlayerId: player.espnPlayerId,
      name: player.name,
      position: player.position,
      nflTeam: player.nflTeam,
      leaguePoints: player.leaguePoints,
      draftValue,
      rank: 0,
      posRankLabel: "",
    };
    const group = posGroups.get(player.position) ?? [];
    group.push(entry);
    posGroups.set(player.position, group);
  }

  for (const group of posGroups.values()) {
    group.sort((a, b) => b.draftValue - a.draftValue || b.leaguePoints - a.leaguePoints);
    group.forEach((player, index) => {
      player.posRankLabel = formatPosRank(player.position, index + 1);
    });
  }

  const ranked = [...adjusted]
    .map((player) => {
      const entry = posGroups
        .get(player.position)!
        .find((candidate) => candidate.id === player.id)!;
      return entry;
    })
    .sort(
      (a, b) =>
        b.draftValue - a.draftValue ||
        b.leaguePoints - a.leaguePoints ||
        a.name.localeCompare(b.name),
    );

  ranked.forEach((player, index) => {
    player.rank = index + 1;
  });

  return ranked;
}

export function rosterMinimumsFilled(
  roster: Record<SkillPosition, MockDraftPlayer[]>,
): boolean {
  return (
    roster.QB.length >= LEAGUE_ROSTER.QB &&
    roster.RB.length >= LEAGUE_ROSTER.RB &&
    roster.WR.length >= LEAGUE_ROSTER.WR &&
    roster.TE.length >= LEAGUE_ROSTER.TE
  );
}
