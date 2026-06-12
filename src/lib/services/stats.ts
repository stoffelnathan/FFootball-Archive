import { prisma } from "@/lib/db";
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
    const seeds = owner.teams
      .map((team) => team.playoffSeed)
      .filter((seed): seed is number => seed != null);
    const playoffAppearances = owner.teams.filter(
      (team) => team.playoffSeed != null && team.playoffSeed <= 6,
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
        seeds.length > 0
          ? seeds.reduce((sum, seed) => sum + seed, 0) / seeds.length
          : null,
      seasonsPlayed: owner.teams.length,
    };
  });
}

export function computeLongestWinStreak(
  results: MatchupResult[],
): { ownerId: string; streak: number } | null {
  const byOwner = new Map<string, MatchupResult[]>();
  for (const result of results) {
    const list = byOwner.get(result.ownerId) ?? [];
    list.push(result);
    byOwner.set(result.ownerId, list);
  }

  let best: { ownerId: string; streak: number } | null = null;

  for (const [ownerId, games] of byOwner) {
    let current = 0;
    for (const game of games) {
      if (game.won) {
        current += 1;
        if (!best || current > best.streak) {
          best = { ownerId, streak: current };
        }
      } else if (!game.tied) {
        current = 0;
      }
    }
  }

  return best;
}

export function computeHighestWeeklyScore(
  results: MatchupResult[],
): { ownerId: string; score: number; seasonYear: number; weekNumber: number } | null {
  let best: {
    ownerId: string;
    score: number;
    seasonYear: number;
    weekNumber: number;
  } | null = null;

  for (const result of results) {
    if (!best || result.teamScore > best.score) {
      best = {
        ownerId: result.ownerId,
        score: result.teamScore,
        seasonYear: result.seasonYear,
        weekNumber: result.weekNumber,
      };
    }
  }

  return best;
}
