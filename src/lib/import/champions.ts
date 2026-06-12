import { CHAMPION_OVERRIDES } from "@/lib/espn/champions";
import { prisma } from "@/lib/db";

export async function resolveSeasonChampions(seasonId: string, year: number) {
  const override = CHAMPION_OVERRIDES[year];
  if (override) {
    const [champion, runnerUp] = await Promise.all([
      prisma.owner.findFirst({
        where: { displayName: override.champion },
      }),
      prisma.owner.findFirst({
        where: { displayName: override.runnerUp },
      }),
    ]);
    if (champion) {
      await applyChampions(seasonId, champion.id, runnerUp?.id ?? null);
      return;
    }
  }

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: {
      teams: true,
      weeks: {
        where: { isPlayoff: true },
        include: {
          matchups: {
            include: {
              homeTeam: true,
              awayTeam: true,
            },
          },
        },
        orderBy: { weekNumber: "desc" },
      },
    },
  });

  if (!season?.weeks.length) return;

  const topSeed = [...season.teams].sort(
    (a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor,
  )[0];
  if (!topSeed) return;

  const finalWeek = season.weeks[0];
  const championshipMatchup = finalWeek.matchups.find(
    (matchup) =>
      matchup.homeTeamId === topSeed.id || matchup.awayTeamId === topSeed.id,
  );

  if (!championshipMatchup) return;

  const topSeedIsHome = championshipMatchup.homeTeamId === topSeed.id;
  const topSeedScore = topSeedIsHome
    ? championshipMatchup.homeScore
    : championshipMatchup.awayScore;
  const opponentScore = topSeedIsHome
    ? championshipMatchup.awayScore
    : championshipMatchup.homeScore;
  const opponentTeamId = topSeedIsHome
    ? championshipMatchup.awayTeamId
    : championshipMatchup.homeTeamId;

  const championOwnerId =
    topSeedScore >= opponentScore ? topSeed.ownerId : (
      await prisma.team.findUnique({ where: { id: opponentTeamId } })
    )?.ownerId;
  const runnerUpOwnerId =
    topSeedScore >= opponentScore ? (
      await prisma.team.findUnique({ where: { id: opponentTeamId } })
    )?.ownerId : topSeed.ownerId;

  if (championOwnerId) {
    await applyChampions(seasonId, championOwnerId, runnerUpOwnerId ?? null);
  }
}

async function applyChampions(
  seasonId: string,
  championOwnerId: string,
  runnerUpOwnerId: string | null,
) {
  await prisma.season.update({
    where: { id: seasonId },
    data: {
      championId: championOwnerId,
      runnerUpId: runnerUpOwnerId,
    },
  });

  await prisma.award.upsert({
    where: {
      seasonId_awardType: {
        seasonId,
        awardType: "CHAMPION",
      },
    },
    create: {
      seasonId,
      awardType: "CHAMPION",
      ownerId: championOwnerId,
    },
    update: {
      ownerId: championOwnerId,
    },
  });
}
