import { prisma } from "@/lib/db";
import {
  buildDisplayStats,
  teamTargetsForSeason,
} from "@/lib/import/player-season-stats";
import { type PlayerStatMap } from "@/lib/espn/player-stats";
import { isEspnPlayerId } from "@/lib/player-url";

function statsFromJson(value: unknown): PlayerStatMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as PlayerStatMap;
}

export async function resolvePlayer(routeId: string) {
  if (isEspnPlayerId(routeId)) {
    return prisma.player.findUnique({
      where: { espnPlayerId: Number(routeId) },
    });
  }

  return prisma.player.findUnique({
    where: { id: routeId },
  });
}

export async function getAvailableSeasonYears() {
  const seasons = await prisma.season.findMany({
    orderBy: { year: "asc" },
    select: { year: true },
  });
  return seasons.map((season) => season.year);
}

export async function getPlayers(search?: string) {
  const [seasonYears, players] = await Promise.all([
    getAvailableSeasonYears(),
    prisma.player.findMany({
      where: search
        ? { name: { contains: search, mode: "insensitive" } }
        : undefined,
      orderBy: { name: "asc" },
      take: search ? 50 : 200,
    }),
  ]);

  if (players.length === 0) {
    return { seasonYears, players: [] };
  }

  const seasonStats = await prisma.playerSeasonStat.findMany({
    where: { playerId: { in: players.map((player) => player.id) } },
    include: { season: { select: { year: true } } },
  });

  const totalsByPlayer = new Map<string, Map<number, number>>();
  for (const row of seasonStats) {
    const playerTotals =
      totalsByPlayer.get(row.playerId) ?? new Map<number, number>();
    playerTotals.set(row.season.year, row.fantasyPointsTotal);
    totalsByPlayer.set(row.playerId, playerTotals);
  }

  return {
    seasonYears,
    players: players.map((player) => ({
      ...player,
      seasonPoints: Object.fromEntries(
        seasonYears.map((year) => [
          year,
          totalsByPlayer.get(player.id)?.get(year) ?? 0,
        ]),
      ),
    })),
  };
}

async function buildSeasonStatsBundle(
  playerId: string,
  nflTeam: string | null,
  year: number,
) {
  const season = await prisma.season.findFirst({
    where: { year },
    select: { id: true },
  });
  if (!season) return null;

  const [seasonStat, teamTargets, weeklyScores] = await Promise.all([
    prisma.playerSeasonStat.findUnique({
      where: {
        seasonId_playerId: {
          seasonId: season.id,
          playerId,
        },
      },
    }),
    teamTargetsForSeason(season.id, nflTeam),
    prisma.weeklyPlayerScore.findMany({
      where: {
        playerId,
        week: { seasonId: season.id },
      },
      include: {
        week: true,
        team: { include: { owner: true } },
      },
      orderBy: { week: { weekNumber: "asc" } },
    }),
  ]);

  if (!seasonStat && weeklyScores.length === 0) return null;

  const weekly = weeklyScores.map((score) => {
    const stats = statsFromJson(score.stats);
    return {
      weekNumber: score.week.weekNumber,
      fantasyPoints: score.fantasyPoints,
      ownerName: score.team?.owner.displayName ?? "—",
      stats,
    };
  });

  const seasonStats = statsFromJson(seasonStat?.stats);
  const totals = buildDisplayStats(
    seasonStats,
    teamTargets,
    seasonStat?.fantasyPointsTotal ?? 0,
  );

  if (seasonStats.receptions != null) {
    totals.games = weekly.filter(
      (line) =>
        line.fantasyPoints > 0 ||
        (line.stats.receptions ?? 0) > 0 ||
        (line.stats.targets ?? 0) > 0,
    ).length;
  }

  return {
    ownerName: weekly.find((line) => line.ownerName !== "—")?.ownerName ?? "—",
    totals,
    weekly,
  };
}

export async function getPlayerById(routeId: string) {
  const player = await resolvePlayer(routeId);
  if (!player) return null;

  const playerRecord = await prisma.player.findUnique({
    where: { id: player.id },
    include: {
      draftPicks: {
        include: {
          season: true,
          team: { include: { owner: true } },
        },
        orderBy: { season: { year: "asc" } },
      },
    },
  });

  if (!playerRecord) return null;

  const seasonYears = await getAvailableSeasonYears();
  const bundles = await Promise.all(
    seasonYears.map(async (year) => ({
      year,
      bundle: await buildSeasonStatsBundle(
        playerRecord.id,
        playerRecord.nflTeam,
        year,
      ),
    })),
  );

  const dataBySeason: Record<
    number,
    NonNullable<Awaited<ReturnType<typeof buildSeasonStatsBundle>>>
  > = {};
  const activeSeasons: number[] = [];

  for (const entry of bundles) {
    if (entry.bundle) {
      dataBySeason[entry.year] = entry.bundle;
      activeSeasons.push(entry.year);
    }
  }

  activeSeasons.sort((a, b) => b - a);

  return {
    player: playerRecord,
    seasons: activeSeasons,
    dataBySeason,
  };
}
