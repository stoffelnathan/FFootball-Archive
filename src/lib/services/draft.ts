import { prisma } from "@/lib/db";

export async function getDraftPicks(seasonYear?: number) {
  return prisma.draftPick.findMany({
    where: seasonYear ? { season: { year: seasonYear } } : undefined,
    include: {
      player: true,
      season: true,
      team: { include: { owner: true } },
    },
    orderBy: [{ season: { year: "desc" } }, { overallPick: "asc" }],
  });
}

export async function getDraftPickById(pickId: string) {
  const pick = await prisma.draftPick.findUnique({
    where: { id: pickId },
    include: {
      player: true,
      season: true,
      team: { include: { owner: true } },
    },
  });

  if (!pick) return null;

  const seasonPoints = await prisma.weeklyPlayerScore.aggregate({
    where: {
      playerId: pick.playerId,
      week: { seasonId: pick.seasonId },
    },
    _sum: { fantasyPoints: true },
  });

  return {
    pick,
    seasonPoints: seasonPoints._sum.fantasyPoints ?? 0,
  };
}

export async function getDraftSeasons() {
  const seasons = await prisma.season.findMany({
    select: { year: true, id: true },
    orderBy: { year: "desc" },
  });
  return seasons;
}
