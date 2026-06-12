import { prisma } from "@/lib/db";
import {
  getCachedFinalRankMap,
  loadFinalRankMap,
  madePlayoffs,
  resolveFinalRank,
} from "@/lib/import/team-standings";
import type { MatchupResult, OwnerCareerStats } from "@/lib/types";
import { winPercentage } from "@/lib/types";

export async function getAllMatchupResults(): Promise<MatchupResult[]> {
  const matchups = await prisma.matchup.findMany({
    include: {
      week: { include: { season: true } },
      homeTeam: { include: { owner: true } },
      awayTeam: { include: { owner: true } },
    },
    orderBy: [{ week: { season: { year: "asc" } } }, { week: { weekNumber: "asc" } }],
  });

  const results: MatchupResult[] = [];

  for (const matchup of matchups) {
    const base = {
      matchupId: matchup.id,
      seasonYear: matchup.week.season.year,
      weekNumber: matchup.week.weekNumber,
      isPlayoff: matchup.isPlayoff,
    };

    results.push({
      ...base,
      ownerId: matchup.homeTeam.ownerId,
      opponentOwnerId: matchup.awayTeam.ownerId,
      teamScore: matchup.homeScore,
      opponentScore: matchup.awayScore,
      won: matchup.homeScore > matchup.awayScore,
      tied: matchup.homeScore === matchup.awayScore,
    });

    results.push({
      ...base,
      ownerId: matchup.awayTeam.ownerId,
      opponentOwnerId: matchup.homeTeam.ownerId,
      teamScore: matchup.awayScore,
      opponentScore: matchup.homeScore,
      won: matchup.awayScore > matchup.homeScore,
      tied: matchup.homeScore === matchup.awayScore,
    });
  }

  return results;
}

export async function getOwnerCareerStats(): Promise<OwnerCareerStats[]> {
  try {
    await loadFinalRankMap();
  } catch (error) {
    console.warn("Could not sync final ranks from ESPN:", error);
  }

  const rankMap = getCachedFinalRankMap();
  const owners = await prisma.owner.findMany({
    include: {
      teams: { include: { season: true } },
      championOf: true,
      runnerUpOf: true,
    },
    orderBy: { displayName: "asc" },
  });

  return owners.map((owner) => {
    const wins = owner.teams.reduce((sum, team) => sum + team.wins, 0);
    const losses = owner.teams.reduce((sum, team) => sum + team.losses, 0);
    const ties = owner.teams.reduce((sum, team) => sum + team.ties, 0);
    const pointsFor = owner.teams.reduce((sum, team) => sum + team.pointsFor, 0);
    const pointsAgainst = owner.teams.reduce(
      (sum, team) => sum + team.pointsAgainst,
      0,
    );
    const finishes = owner.teams
      .map((team) => resolveFinalRank(team.id, team.finalRank, rankMap))
      .filter((rank): rank is number => rank != null);
    const playoffAppearances = owner.teams.filter((team) =>
      madePlayoffs(
        team.playoffSeed,
        team.season.playoffTeamCount ?? undefined,
      ),
    ).length;

    return {
      ownerId: owner.id,
      displayName: owner.displayName,
      championships: owner.championOf.length,
      runnerUps: owner.runnerUpOf.length,
      wins,
      losses,
      ties,
      winPercentage: winPercentage(wins, losses, ties),
      pointsFor,
      pointsAgainst,
      playoffAppearances,
      averageFinish:
        finishes.length > 0
          ? finishes.reduce((sum, rank) => sum + rank, 0) / finishes.length
          : null,
      seasonsPlayed: owner.teams.length,
    };
  });
}

export function getTopTied<T>(
  items: T[],
  getValue: (item: T) => number,
): T[] {
  if (items.length === 0) return [];
  const max = Math.max(...items.map(getValue));
  return items.filter((item) => getValue(item) === max);
}

export function computeLongestWinStreaks(
  results: MatchupResult[],
): Array<{ ownerId: string; streak: number }> {
  const byOwner = new Map<string, MatchupResult[]>();
  for (const result of results) {
    const list = byOwner.get(result.ownerId) ?? [];
    list.push(result);
    byOwner.set(result.ownerId, list);
  }

  const streaks: Array<{ ownerId: string; streak: number }> = [];

  for (const [ownerId, games] of byOwner) {
    let current = 0;
    let best = 0;
    for (const game of games) {
      if (game.won) {
        current += 1;
        best = Math.max(best, current);
      } else if (!game.tied) {
        current = 0;
      }
    }
    streaks.push({ ownerId, streak: best });
  }

  const maxStreak = Math.max(...streaks.map((entry) => entry.streak), 0);
  return streaks.filter((entry) => entry.streak === maxStreak && entry.streak > 0);
}

export function uniqueHighestWeeklyScores(
  results: MatchupResult[],
): Array<{
  ownerId: string;
  score: number;
  seasonYear: number;
  weekNumber: number;
}> {
  let bestScore = 0;
  for (const result of results) {
    if (result.teamScore > bestScore) bestScore = result.teamScore;
  }
  if (bestScore === 0) return [];

  return results
    .filter((result) => result.teamScore === bestScore)
    .map((result) => ({
      ownerId: result.ownerId,
      score: result.teamScore,
      seasonYear: result.seasonYear,
      weekNumber: result.weekNumber,
    }));
}
