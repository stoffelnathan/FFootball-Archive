import { SKILL_POSITIONS, type SkillPosition } from "@/lib/league-settings";
import { formatPosRank } from "@/lib/player-positions";
import {
  lookupUnderdogRank,
  normalizePlayerName,
} from "@/lib/mock-draft/underdog-baseline";
import type { MockDraftPlayer } from "@/lib/mock-draft/types";

type PoolPlayer = {
  id: string;
  espnPlayerId: number;
  name: string;
  position: string;
  nflTeam: string | null;
  leaguePoints: number;
};

function isSkillPosition(position: string): position is SkillPosition {
  return SKILL_POSITIONS.includes(position as SkillPosition);
}

/**
 * Underdog uses half-PPR; bump WRs toward full-PPR value (reception premium).
 * Skip the top five Underdog WRs so Bijan/Gibbs stay 1–2 and Chase stays 3.
 */
function wrFullPprLift(underdogRank: number): number {
  if (underdogRank <= 5) return 0;
  if (underdogRank <= 24) return 2;
  if (underdogRank <= 48) return 3;
  if (underdogRank <= 96) return 4;
  if (underdogRank <= 144) return 3;
  return 2;
}

/** Positive = later pick (down); negative = earlier pick (up). */
const PLAYER_RANK_DELTAS: Record<string, number> = {
  "malik nabers": 3,
  "aj brown": -2,
};

/**
 * Adjustments for our full-PPR league (TE at 1.5 PPR) from Underdog half-PPR ADP.
 */
function effectiveRank(
  underdogRank: number,
  position: SkillPosition,
  name: string,
): number {
  let rank = underdogRank;
  const key = normalizePlayerName(name);

  if (position === "WR") {
    rank -= wrFullPprLift(underdogRank);
  }

  if (position === "TE") {
    if (key.includes("mcbride")) {
      // Target ~4–5 on the board (Underdog 25).
      rank -= 21;
    } else if (key.includes("bowers")) {
      // Target ~9–10 on the board (Underdog 20).
      rank -= 14;
    } else if (underdogRank <= 50) {
      rank -= 12;
    } else if (underdogRank <= 90) {
      rank -= 8;
    } else {
      rank -= 5;
    }
  }

  const delta = PLAYER_RANK_DELTAS[key];
  if (delta != null) {
    rank += delta;
  }

  return Math.max(1, rank);
}

/**
 * Build mock draft rankings from June 2026 Underdog ADP (half-PPR), adjusted for
 * full PPR (WR lift) and TE premium (1.5 PPR).
 */
export function buildMockDraftRankings(
  poolPlayers: PoolPlayer[],
): MockDraftPlayer[] {
  const withUnderdog = poolPlayers
    .filter((player) => isSkillPosition(player.position))
    .map((player) => {
      const hit = lookupUnderdogRank(player.name);
      return {
        player,
        underdogRank: hit?.rank ?? null,
        position: (hit?.position ?? player.position) as SkillPosition,
      };
    });

  const merged = withUnderdog
    .filter((entry): entry is typeof entry & { underdogRank: number } =>
      entry.underdogRank != null,
    )
    .map((entry) => {
      const rank = effectiveRank(
        entry.underdogRank,
        entry.position,
        entry.player.name,
      );

      return {
        id: entry.player.id,
        espnPlayerId: entry.player.espnPlayerId,
        name: entry.player.name,
        position: entry.position,
        nflTeam: entry.player.nflTeam,
        leaguePoints: entry.player.leaguePoints,
        draftValue: 1000 - rank - entry.underdogRank / 1000,
        rank: 0,
        posRankLabel: "",
      } satisfies MockDraftPlayer;
    });

  const unmatched = withUnderdog
    .filter((entry) => entry.underdogRank == null)
    .map((entry) => entry.player)
    .sort((a, b) => b.leaguePoints - a.leaguePoints || a.name.localeCompare(b.name));

  let fallbackRank = 180;
  for (const player of unmatched) {
    if (!isSkillPosition(player.position)) continue;
    merged.push({
      id: player.id,
      espnPlayerId: player.espnPlayerId,
      name: player.name,
      position: player.position,
      nflTeam: player.nflTeam,
      leaguePoints: player.leaguePoints,
      draftValue: 1000 - fallbackRank,
      rank: 0,
      posRankLabel: "",
    });
    fallbackRank += 1;
  }

  for (const position of SKILL_POSITIONS) {
    const group = merged
      .filter((player) => player.position === position)
      .sort(
        (a, b) =>
          b.draftValue - a.draftValue ||
          b.leaguePoints - a.leaguePoints ||
          a.name.localeCompare(b.name),
      );
    group.forEach((player, index) => {
      player.posRankLabel = formatPosRank(player.position, index + 1);
    });
  }

  const ranked = [...merged].sort(
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
