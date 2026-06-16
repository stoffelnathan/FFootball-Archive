import {
  LEAGUE_ROSTER,
  MOCK_DRAFT,
  type SkillPosition,
} from "@/lib/league-settings";
import { normalizePlayerName } from "@/lib/mock-draft/underdog-baseline";
import type {
  MockDraftPick,
  MockDraftPlayer,
  MockDraftRoster,
  MockDraftTeam,
} from "@/lib/mock-draft/types";

export function rosterMinimumsFilled(roster: MockDraftRoster): boolean {
  return (
    roster.QB.length >= LEAGUE_ROSTER.QB &&
    roster.RB.length >= LEAGUE_ROSTER.RB &&
    roster.WR.length >= LEAGUE_ROSTER.WR &&
    roster.TE.length >= LEAGUE_ROSTER.TE
  );
}

export function buildTeams(userSlot: number): MockDraftTeam[] {
  return Array.from({ length: MOCK_DRAFT.teamCount }, (_, index) => {
    const slot = index + 1;
    return {
      slot,
      name: slot === userSlot ? "You" : `CPU ${slot}`,
      isUser: slot === userSlot,
    };
  });
}

export function pickOrderForRound(round: number): number[] {
  const base = Array.from({ length: MOCK_DRAFT.teamCount }, (_, index) => index + 1);
  return round % 2 === 1 ? base : [...base].reverse();
}

export function teamSlotForPick(overallPick: number): number {
  const round = Math.ceil(overallPick / MOCK_DRAFT.teamCount);
  const pickInRound = ((overallPick - 1) % MOCK_DRAFT.teamCount) + 1;
  return pickOrderForRound(round)[pickInRound - 1]!;
}

export function roundForPick(overallPick: number): number {
  return Math.ceil(overallPick / MOCK_DRAFT.teamCount);
}

export function roundPickNumber(overallPick: number): number {
  return ((overallPick - 1) % MOCK_DRAFT.teamCount) + 1;
}

export function totalPicks(): number {
  return MOCK_DRAFT.teamCount * MOCK_DRAFT.rounds;
}

export function emptyRoster(): MockDraftRoster {
  return { QB: [], RB: [], WR: [], TE: [] };
}

export function rosterFromPicks(
  teamSlot: number,
  picks: MockDraftPick[],
): MockDraftRoster {
  const roster = emptyRoster();
  for (const pick of picks) {
    if (pick.teamSlot !== teamSlot) continue;
    roster[pick.player.position].push(pick.player);
  }
  return roster;
}

export type DraftOrderRosterSlot = {
  label: string;
  player: MockDraftPlayer | null;
  pick: MockDraftPick | null;
};

export type DraftOrderRosterLayout = {
  starters: DraftOrderRosterSlot[];
  bench: DraftOrderRosterSlot[];
};

/** Assign picks to roster slots in draft order (QB, RB×2, WR×2, TE, FLEX×2, then bench). */
export function draftOrderRosterLayout(
  teamSlot: number,
  picks: MockDraftPick[],
): DraftOrderRosterLayout {
  const teamPicks = picks
    .filter((pick) => pick.teamSlot === teamSlot)
    .sort((a, b) => a.overallPick - b.overallPick);

  const starterLabels = [
    "QB",
    "RB",
    "RB",
    "WR",
    "WR",
    "TE",
    "FLEX",
    "FLEX",
  ] as const;

  const starters: DraftOrderRosterSlot[] = starterLabels.map((label) => ({
    label,
    player: null,
    pick: null,
  }));

  const bench: DraftOrderRosterSlot[] = [];
  let rbFilled = 0;
  let wrFilled = 0;
  let flexFilled = 0;

  for (const pick of teamPicks) {
    const { position } = pick.player;

    if (position === "QB") {
      const slot = starters[0]!;
      if (!slot.player) {
        slot.player = pick.player;
        slot.pick = pick;
        continue;
      }
    }

    if (position === "RB" && rbFilled < LEAGUE_ROSTER.RB) {
      const slot = starters[1 + rbFilled]!;
      slot.player = pick.player;
      slot.pick = pick;
      rbFilled += 1;
      continue;
    }

    if (position === "WR" && wrFilled < LEAGUE_ROSTER.WR) {
      const slot = starters[3 + wrFilled]!;
      slot.player = pick.player;
      slot.pick = pick;
      wrFilled += 1;
      continue;
    }

    if (position === "TE") {
      const slot = starters[5]!;
      if (!slot.player) {
        slot.player = pick.player;
        slot.pick = pick;
        continue;
      }
    }

    if (position !== "QB" && flexFilled < LEAGUE_ROSTER.FLEX) {
      const slot = starters[6 + flexFilled]!;
      slot.player = pick.player;
      slot.pick = pick;
      flexFilled += 1;
      continue;
    }

    bench.push({
      label: "BN",
      player: pick.player,
      pick,
    });
  }

  return { starters, bench };
}

function countByPosition(roster: MockDraftRoster): Record<SkillPosition, number> {
  return {
    QB: roster.QB.length,
    RB: roster.RB.length,
    WR: roster.WR.length,
    TE: roster.TE.length,
  };
}

/**
 * Positional need score used to nudge CPU teams toward balanced rosters.
 * Higher = more urgent to draft that position.
 */
function positionalNeed(
  position: SkillPosition,
  roster: MockDraftRoster,
  round: number,
): number {
  const counts = countByPosition(roster);
  const roundsLeft = MOCK_DRAFT.rounds - round + 1;
  const slotsNeeded =
    Math.max(0, LEAGUE_ROSTER.QB - counts.QB) +
    Math.max(0, LEAGUE_ROSTER.RB - counts.RB) +
    Math.max(0, LEAGUE_ROSTER.WR - counts.WR) +
    Math.max(0, LEAGUE_ROSTER.TE - counts.TE);

  let need = 0;

  switch (position) {
    case "QB":
      if (counts.QB >= 2) return -40;
      if (counts.QB === 0 && round >= 8) need += 35;
      else if (counts.QB === 0 && round >= 5) need += 18;
      else if (counts.QB === 0) need += 4;
      else need -= 8;
      break;
    case "RB":
      if (counts.RB < LEAGUE_ROSTER.RB) {
        need += 28 * (LEAGUE_ROSTER.RB - counts.RB);
      } else if (counts.RB < LEAGUE_ROSTER.RB + 2) {
        need += 8;
      }
      break;
    case "WR":
      if (counts.WR < LEAGUE_ROSTER.WR) {
        need += 24 * (LEAGUE_ROSTER.WR - counts.WR);
      } else if (counts.WR < LEAGUE_ROSTER.WR + 2) {
        need += 6;
      }
      break;
    case "TE":
      if (counts.TE < LEAGUE_ROSTER.TE) {
        need += 22 * (LEAGUE_ROSTER.TE - counts.TE);
      } else if (counts.TE >= 2) {
        need -= 12;
      }
      break;
  }

  if (slotsNeeded >= roundsLeft && counts[position] === 0) {
    need += 50;
  }

  if (!rosterMinimumsFilled(roster) && round >= MOCK_DRAFT.rounds - 2) {
    const deficit =
      position === "QB"
        ? LEAGUE_ROSTER.QB - counts.QB
        : position === "RB"
          ? LEAGUE_ROSTER.RB - counts.RB
          : position === "WR"
            ? LEAGUE_ROSTER.WR - counts.WR
            : LEAGUE_ROSTER.TE - counts.TE;
    if (deficit > 0) need += 60 * deficit;
  }

  return need;
}

/** Round-one upset tendencies — multipliers on top of rank-based weight. */
const ROUND1_NAME_BOOSTS: Record<string, number> = {
  "bijan robinson": 1,
  "jahmyr gibbs": 1.5,
  "jamarr chase": 1.25,
  "puka nacua": 1.2,
  "jaxon smith njigba": 0.95,
};

function weightedRandomPick(
  weighted: Array<{ player: MockDraftPlayer; weight: number }>,
): MockDraftPlayer {
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) return weighted[0]!.player;

  let roll = Math.random() * total;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.player;
  }

  return weighted[weighted.length - 1]!.player;
}

function buildCandidates(
  sorted: MockDraftPlayer[],
  round: number,
): MockDraftPlayer[] {
  const poolSize = round === 1 ? 4 : 3;
  const candidates = sorted.slice(0, Math.min(poolSize, sorted.length));

  const bestTe = sorted.find((player) => player.position === "TE");
  if (
    bestTe &&
    bestTe.rank >= 5 &&
    bestTe.rank <= 10 &&
    round <= 4 &&
    !candidates.some((player) => player.id === bestTe.id)
  ) {
    candidates.push(bestTe);
  }

  return candidates;
}

function candidateWeight(
  player: MockDraftPlayer,
  roster: MockDraftRoster,
  round: number,
  bestAvailableRank: number,
): number {
  const rankGap = player.rank - bestAvailableRank;
  let weight = 0.58 ** rankGap;

  if (round === 1) {
    const boost = ROUND1_NAME_BOOSTS[normalizePlayerName(player.name)];
    if (boost != null) weight *= boost;
  }

  if (player.position === "TE" && round <= 4) {
    const counts = countByPosition(roster);
    if (counts.TE === 0 && player.rank > 1) {
      const key = normalizePlayerName(player.name);
      if (key.includes("mcbride")) weight *= 1.45;
      else if (key.includes("bowers")) weight *= 1.2;
      else if (player.rank <= 12) weight *= 1.1;
    }
  }

  const need = positionalNeed(player.position, roster, round);
  weight *= 1 + Math.max(-0.12, Math.min(0.2, need * 0.006));

  return Math.max(weight, 0.001);
}

/**
 * CPU drafts with weighted randomness among the best available players.
 * Mostly follows board rank, with realistic round-one variation and early
 * TE premium urgency so elite TEs do not slide to the end of the first round.
 */
export function cpuSelectPlayer(
  available: MockDraftPlayer[],
  roster: MockDraftRoster,
  round: number,
): MockDraftPlayer {
  const sorted = [...available].sort((a, b) => a.rank - b.rank);
  if (sorted.length === 0) {
    throw new Error("No available players for CPU pick");
  }

  if (!rosterMinimumsFilled(roster) && round >= MOCK_DRAFT.rounds - 2) {
    const counts = countByPosition(roster);
    for (const position of ["QB", "RB", "WR", "TE"] as const) {
      const minimum = LEAGUE_ROSTER[position];
      if (counts[position] >= minimum) continue;
      const bestAtPosition = sorted.find(
        (player) => player.position === position,
      );
      if (bestAtPosition) return bestAtPosition;
    }
  }

  const candidates = buildCandidates(sorted, round);
  const bestAvailableRank = sorted[0]!.rank;

  const weighted = candidates.map((player) => ({
    player,
    weight: candidateWeight(player, roster, round, bestAvailableRank),
  }));

  return weightedRandomPick(weighted);
}

export function availablePlayers(
  allPlayers: MockDraftPlayer[],
  picks: MockDraftPick[],
): MockDraftPlayer[] {
  const drafted = new Set(picks.map((pick) => pick.player.id));
  return allPlayers.filter((player) => !drafted.has(player.id));
}

export function isDraftComplete(picks: MockDraftPick[]): boolean {
  return picks.length >= totalPicks();
}

export function optimalLineupPoints(roster: MockDraftRoster): number {
  const pool = [
    ...roster.QB,
    ...roster.RB,
    ...roster.WR,
    ...roster.TE,
  ].sort((a, b) => b.leaguePoints - a.leaguePoints);

  const used = new Set<string>();
  let total = 0;

  const takeBest = (position: SkillPosition, count: number) => {
    let taken = 0;
    for (const player of pool) {
      if (taken >= count) break;
      if (used.has(player.id)) continue;
      if (player.position !== position) continue;
      used.add(player.id);
      total += player.leaguePoints;
      taken += 1;
    }
  };

  takeBest("QB", LEAGUE_ROSTER.QB);
  takeBest("RB", LEAGUE_ROSTER.RB);
  takeBest("WR", LEAGUE_ROSTER.WR);
  takeBest("TE", LEAGUE_ROSTER.TE);

  let flexLeft: number = LEAGUE_ROSTER.FLEX;
  for (const player of pool) {
    if (flexLeft === 0) break;
    if (used.has(player.id)) continue;
    if (player.position === "QB") continue;
    used.add(player.id);
    total += player.leaguePoints;
    flexLeft -= 1;
  }

  return total;
}
