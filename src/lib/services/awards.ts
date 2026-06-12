import { prisma } from "@/lib/db";
import { getAllMatchupResults } from "@/lib/services/stats";
import type { ComputedAward } from "@/lib/types";
import { formatRecord } from "@/lib/types";

const AWARD_LABELS: Record<string, string> = {
  CHAMPION: "Champion",
  LEAGUE_MVP: "League MVP",
  HIGHEST_SCORING_TEAM: "Highest Scoring Team",
  MOST_CONSISTENT_TEAM: "Most Consistent Team",
  LUCKIEST_TEAM: "Luckiest Team",
  UNLUCKIEST_TEAM: "Unluckiest Team",
  BIGGEST_STEAL: "Biggest Steal",
  BIGGEST_BUST: "Biggest Bust",
  WAIVER_PICKUP: "Waiver Pickup of the Year",
};

export async function getAwardsForSeason(year: number) {
  const season = await prisma.season.findFirst({
    where: { year },
    include: {
      awards: { include: { owner: true } },
      teams: { include: { owner: true } },
    },
  });

  const computed = season ? await computeSeasonAwards(season.id) : [];
  const stored = season?.awards.map((award) => ({
    awardType: award.awardType,
    label: AWARD_LABELS[award.awardType] ?? award.awardType,
    ownerId: award.ownerId,
    ownerName: award.owner.displayName,
    detail: undefined as string | undefined,
  })) ?? [];

  const merged = new Map<string, ComputedAward>();
  for (const award of [...stored, ...computed]) {
    merged.set(award.awardType, award);
  }

  return [...merged.values()];
}

export async function getAllAwards() {
  const seasons = await prisma.season.findMany({ orderBy: { year: "desc" } });
  const results = await Promise.all(
    seasons.map(async (season) => ({
      year: season.year,
      awards: await getAwardsForSeason(season.year),
    })),
  );
  return results;
}

async function computeSeasonAwards(seasonId: string): Promise<ComputedAward[]> {
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: {
      teams: { include: { owner: true } },
      draftPicks: { include: { player: true, team: { include: { owner: true } } } },
      weeks: true,
    },
  });

  if (!season) return [];

  const awards: ComputedAward[] = [];

  const highestScoring = [...season.teams].sort((a, b) => b.pointsFor - a.pointsFor)[0];
  if (highestScoring) {
    awards.push({
      awardType: "HIGHEST_SCORING_TEAM",
      label: AWARD_LABELS.HIGHEST_SCORING_TEAM,
      ownerId: highestScoring.ownerId,
      ownerName: highestScoring.owner.displayName,
      detail: `${highestScoring.pointsFor.toFixed(2)} points for`,
    });
    awards.push({
      awardType: "LEAGUE_MVP",
      label: AWARD_LABELS.LEAGUE_MVP,
      ownerId: highestScoring.ownerId,
      ownerName: highestScoring.owner.displayName,
      detail: "Best overall scoring season",
    });
  }

  const weeklyScoresByTeam = await Promise.all(
    season.teams.map(async (team) => {
      const scores = await prisma.matchup.findMany({
        where: {
          week: { seasonId },
          OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
        },
        include: { week: true },
      });

      const weeklyTotals = scores.map((matchup) =>
        matchup.homeTeamId === team.id ? matchup.homeScore : matchup.awayScore,
      );

      const mean =
        weeklyTotals.reduce((sum, value) => sum + value, 0) /
        Math.max(weeklyTotals.length, 1);
      const variance =
        weeklyTotals.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
        Math.max(weeklyTotals.length, 1);

      return { team, stdDev: Math.sqrt(variance), mean };
    }),
  );

  const mostConsistent = [...weeklyScoresByTeam].sort((a, b) => a.stdDev - b.stdDev)[0];
  if (mostConsistent) {
    awards.push({
      awardType: "MOST_CONSISTENT_TEAM",
      label: AWARD_LABELS.MOST_CONSISTENT_TEAM,
      ownerId: mostConsistent.team.ownerId,
      ownerName: mostConsistent.team.owner.displayName,
      detail: `Std dev ${mostConsistent.stdDev.toFixed(2)}`,
    });
  }

  const draftValues = await Promise.all(
    season.draftPicks.map(async (pick) => {
      const total = await prisma.weeklyPlayerScore.aggregate({
        where: { playerId: pick.playerId, week: { seasonId } },
        _sum: { fantasyPoints: true },
      });
      const value = total._sum.fantasyPoints ?? 0;
      const expectedRoundValue = Math.max(1, 13 - pick.round);
      return { pick, value, score: value / expectedRoundValue };
    }),
  );

  const steal = [...draftValues].sort((a, b) => b.score - a.score)[0];
  const bust = [...draftValues]
    .filter((entry) => entry.pick.round <= 8)
    .sort((a, b) => a.value - b.value)[0];

  if (steal) {
    awards.push({
      awardType: "BIGGEST_STEAL",
      label: AWARD_LABELS.BIGGEST_STEAL,
      ownerId: steal.pick.team.ownerId,
      ownerName: steal.pick.team.owner.displayName,
      detail: `${steal.pick.player.name} (Rd ${steal.pick.round}) — ${steal.value.toFixed(2)} pts`,
    });
  }

  if (bust) {
    awards.push({
      awardType: "BIGGEST_BUST",
      label: AWARD_LABELS.BIGGEST_BUST,
      ownerId: bust.pick.team.ownerId,
      ownerName: bust.pick.team.owner.displayName,
      detail: `${bust.pick.player.name} (Rd ${bust.pick.round}) — ${bust.value.toFixed(2)} pts`,
    });
  }

  return awards;
}

export async function getHeadToHead(ownerAId: string, ownerBId: string) {
  const matchups = await prisma.matchup.findMany({
    where: {
      OR: [
        {
          homeTeam: { ownerId: ownerAId },
          awayTeam: { ownerId: ownerBId },
        },
        {
          homeTeam: { ownerId: ownerBId },
          awayTeam: { ownerId: ownerAId },
        },
      ],
    },
    include: {
      week: { include: { season: true } },
      homeTeam: { include: { owner: true } },
      awayTeam: { include: { owner: true } },
    },
    orderBy: [
      { week: { season: { year: "asc" } } },
      { week: { weekNumber: "asc" } },
    ],
  });

  let aWins = 0;
  let bWins = 0;
  let ties = 0;
  let aPlayoffWins = 0;
  let bPlayoffWins = 0;
  let aPoints = 0;
  let bPoints = 0;
  let highestA = 0;
  let highestB = 0;
  let biggestVictory = 0;

  const history = matchups.map((matchup) => {
    const aHome = matchup.homeTeam.ownerId === ownerAId;
    const aScore = aHome ? matchup.homeScore : matchup.awayScore;
    const bScore = aHome ? matchup.awayScore : matchup.homeScore;
    const margin = Math.abs(aScore - bScore);

    aPoints += aScore;
    bPoints += bScore;
    highestA = Math.max(highestA, aScore);
    highestB = Math.max(highestB, bScore);
    biggestVictory = Math.max(biggestVictory, margin);

    if (aScore > bScore) {
      aWins += 1;
      if (matchup.isPlayoff) aPlayoffWins += 1;
    } else if (bScore > aScore) {
      bWins += 1;
      if (matchup.isPlayoff) bPlayoffWins += 1;
    } else {
      ties += 1;
    }

    return {
      id: matchup.id,
      seasonYear: matchup.week.season.year,
      weekNumber: matchup.week.weekNumber,
      isPlayoff: matchup.isPlayoff,
      aScore,
      bScore,
      winner:
        aScore > bScore ? "A" : bScore > aScore ? "B" : ("tie" as const),
    };
  });

  const games = history.length;

  return {
    ownerAId,
    ownerBId,
    overall: {
      aWins,
      bWins,
      ties,
      record: formatRecord(aWins, bWins, ties),
    },
    playoff: {
      aWins: aPlayoffWins,
      bWins: bPlayoffWins,
      record: formatRecord(aPlayoffWins, bPlayoffWins),
    },
    averageScore: {
      a: games ? aPoints / games : 0,
      b: games ? bPoints / games : 0,
    },
    highestScore: { a: highestA, b: highestB },
    biggestVictory: biggestVictory,
    history,
  };
}

export async function searchAll(query: string) {
  const q = query.trim();
  if (!q) {
    return { players: [], owners: [], seasons: [], teams: [] };
  }

  const [players, owners, seasons, teams] = await Promise.all([
    prisma.player.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 10,
    }),
    prisma.owner.findMany({
      where: { displayName: { contains: q, mode: "insensitive" } },
      take: 10,
    }),
    prisma.season.findMany({
      where: { year: Number.isNaN(Number(q)) ? undefined : Number(q) },
      take: 10,
    }),
    prisma.team.findMany({
      where: { teamName: { contains: q, mode: "insensitive" } },
      include: { owner: true, season: true },
      take: 10,
    }),
  ]);

  return { players, owners, seasons, teams };
}

export async function getAnalytics() {
  const [careerStats, seasons, matchupResults] = await Promise.all([
    prisma.owner.findMany({
      include: {
        teams: { include: { season: true } },
        championOf: true,
      },
    }).then((owners) =>
      owners.map((owner) => ({
        id: owner.id,
        name: owner.displayName,
        championships: owner.championOf.map((season) => season.year),
        seasons: owner.teams.map((team) => ({
          year: team.season.year,
          wins: team.wins,
          losses: team.losses,
          pointsFor: team.pointsFor,
        })),
      })),
    ),
    prisma.season.findMany({
      orderBy: { year: "asc" },
      include: { teams: true, champion: true },
    }),
    getAllMatchupResults(),
  ]);

  const pointsBySeason = seasons.map((season) => ({
    year: season.year,
    avgPointsFor:
      season.teams.reduce((sum, team) => sum + team.pointsFor, 0) /
      Math.max(season.teams.length, 1),
    totalPoints: season.teams.reduce((sum, team) => sum + team.pointsFor, 0),
  }));

  const weeklyAverage =
    matchupResults.reduce((sum, result) => sum + result.teamScore, 0) /
    Math.max(matchupResults.length, 1);

  const championshipTimeline = seasons
    .filter((season) => season.championId && season.champion)
    .map((season) => ({
      year: season.year,
      championId: season.championId!,
      championName: season.champion!.displayName,
    }));

  return {
    careerStats,
    pointsBySeason,
    weeklyAverage,
    championshipTimeline,
    teamPerformance: careerStats,
  };
}
