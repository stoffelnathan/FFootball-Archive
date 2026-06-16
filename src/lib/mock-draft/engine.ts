import {
  LEAGUE_ROSTER,
  MOCK_DRAFT,
  type SkillPosition,
} from "@/lib/league-settings";
import { rosterMinimumsFilled } from "@/lib/mock-draft/rankings";
import type {
  MockDraftPick,
  MockDraftPlayer,
  MockDraftRoster,
  MockDraftTeam,
} from "@/lib/mock-draft/types";

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

/**
 * CPU selects from the top five available players by draft value, weighted
 * by roster need with light randomness so picks aren't identical every time.
 */
export function cpuSelectPlayer(
  available: MockDraftPlayer[],
  roster: MockDraftRoster,
  round: number,
): MockDraftPlayer {
  const sorted = [...available].sort(
    (a, b) => b.draftValue - a.draftValue || b.leaguePoints - a.leaguePoints,
  );
  const candidates = sorted.slice(0, 5);

  let best = candidates[0]!;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const candidate of candidates) {
    const need = positionalNeed(candidate.position, roster, round);
    const noise = Math.random() * 4;
    const score = candidate.draftValue + need + noise;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
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
