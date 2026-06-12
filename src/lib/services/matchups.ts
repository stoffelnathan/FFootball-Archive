import { prisma } from "@/lib/db";

export async function getWeeksBySeasonYear(year: number) {
  const season = await prisma.season.findFirst({
    where: { year },
    include: {
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          matchups: {
            include: {
              homeTeam: { include: { owner: true } },
              awayTeam: { include: { owner: true } },
            },
          },
        },
      },
    },
  });

  return season?.weeks ?? [];
}

export async function getMatchupById(matchupId: string) {
  const matchup = await prisma.matchup.findUnique({
    where: { id: matchupId },
    include: {
      week: { include: { season: true } },
      homeTeam: { include: { owner: true } },
      awayTeam: { include: { owner: true } },
    },
  });

  if (!matchup) return null;

  const [homeRoster, awayRoster] = await Promise.all([
    prisma.weeklyRosterSnapshot.findMany({
      where: { weekId: matchup.weekId, teamId: matchup.homeTeamId },
      include: { player: true },
      orderBy: [{ starter: "desc" }, { lineupSlot: "asc" }],
    }),
    prisma.weeklyRosterSnapshot.findMany({
      where: { weekId: matchup.weekId, teamId: matchup.awayTeamId },
      include: { player: true },
      orderBy: [{ starter: "desc" }, { lineupSlot: "asc" }],
    }),
  ]);

  const scores = await prisma.weeklyPlayerScore.findMany({
    where: { weekId: matchup.weekId },
  });
  const scoreMap = new Map(
    scores.map((score) => [`${score.teamId}:${score.playerId}`, score.fantasyPoints]),
  );

  const enrich = (
    roster: typeof homeRoster,
    teamId: string,
  ) =>
    roster.map((entry) => ({
      ...entry,
      fantasyPoints: scoreMap.get(`${teamId}:${entry.playerId}`) ?? 0,
    }));

  return {
    matchup,
    homeRoster: enrich(homeRoster, matchup.homeTeamId),
    awayRoster: enrich(awayRoster, matchup.awayTeamId),
  };
}

export async function getMatchups(filters?: {
  seasonYear?: number;
  weekNumber?: number;
}) {
  return prisma.matchup.findMany({
    where: {
      week: {
        season: filters?.seasonYear ? { year: filters.seasonYear } : undefined,
        weekNumber: filters?.weekNumber,
      },
    },
    include: {
      week: { include: { season: true } },
      homeTeam: { include: { owner: true } },
      awayTeam: { include: { owner: true } },
    },
    orderBy: [
      { week: { season: { year: "desc" } } },
      { week: { weekNumber: "asc" } },
    ],
  });
}
