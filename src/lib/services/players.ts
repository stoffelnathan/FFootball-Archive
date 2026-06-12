import { prisma } from "@/lib/db";
import {
  buildDisplayStats,
  teamTargetsForSeason,
} from "@/lib/import/player-season-stats";
import { type PlayerStatMap } from "@/lib/espn/player-stats";
import {
  buildPosRanks,
  formatPosRank,
  type PlayerPositionFilterId,
  positionsForFilter,
} from "@/lib/player-positions";
import { formatWeekMatchupLabel } from "@/lib/espn/pro-schedule";
import { ensurePlayerProStats } from "@/lib/import/player-pro-stats";
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
  const directory = await getPlayerDirectory({
    search,
    position: "OFFENSE",
  });

  return {
    seasonYears: directory.seasonYears,
    players: directory.players.map((player) => ({
      id: player.id,
      espnPlayerId: player.espnPlayerId,
      name: player.name,
      position: player.position,
      nflTeam: player.nflTeam,
      seasonPoints: {
        [directory.latestSeasonYear]: player.points,
      },
    })),
  };
}

export type PlayerDirectoryEntry = {
  id: string;
  espnPlayerId: number;
  name: string;
  position: string;
  nflTeam: string | null;
  points: number;
  posRank: number | null;
  posRankLabel: string;
};

export async function getPlayerDirectory(options?: {
  search?: string;
  position?: PlayerPositionFilterId;
}) {
  const seasonYears = await getAvailableSeasonYears();
  const latestSeasonYear = seasonYears[seasonYears.length - 1] ?? new Date().getFullYear();
  const positionFilter = options?.position ?? "OFFENSE";
  const allowedPositions = positionsForFilter(positionFilter);

  const latestSeason = await prisma.season.findFirst({
    where: { year: latestSeasonYear },
    select: { id: true },
  });

  if (!latestSeason) {
    return {
      latestSeasonYear,
      seasonYears,
      positionFilter,
      players: [] as PlayerDirectoryEntry[],
    };
  }

  const allScoredPlayers = await prisma.player.findMany({
    where: {
      seasonStats: {
        some: {
          seasonId: latestSeason.id,
          fantasyPointsTotal: { gt: 0 },
        },
      },
    },
    include: {
      seasonStats: {
        where: { seasonId: latestSeason.id },
        take: 1,
      },
    },
  });

  const posRanks = buildPosRanks(
    allScoredPlayers.map((player) => ({
      id: player.id,
      position: player.position,
      points: player.seasonStats[0]?.fantasyPointsTotal ?? 0,
    })),
  );

  const players = await prisma.player.findMany({
    where: {
      ...(options?.search
        ? { name: { contains: options.search, mode: "insensitive" } }
        : {}),
      ...(allowedPositions
        ? { position: { in: allowedPositions } }
        : {}),
      seasonStats: {
        some: {
          seasonId: latestSeason.id,
          fantasyPointsTotal: { gt: 0 },
        },
      },
    },
    include: {
      seasonStats: {
        where: { seasonId: latestSeason.id },
        take: 1,
      },
    },
  });

  const withPoints = players
    .map((player) => ({
      id: player.id,
      espnPlayerId: player.espnPlayerId,
      name: player.name,
      position: player.position,
      nflTeam: player.nflTeam,
      points: player.seasonStats[0]?.fantasyPointsTotal ?? 0,
    }))
    .filter((player) => player.points > 0);

  const directory = withPoints
    .map((player) => {
      const rank = posRanks.get(player.id) ?? null;
      return {
        ...player,
        posRank: rank,
        posRankLabel: formatPosRank(player.position, rank),
      };
    })
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  return {
    latestSeasonYear,
    seasonYears,
    positionFilter,
    players: directory,
  };
}

async function buildSeasonStatsBundle(
  playerId: string,
  espnPlayerId: number,
  position: string,
  nflTeam: string | null,
  year: number,
) {
  const season = await prisma.season.findFirst({
    where: { year },
    select: { id: true },
  });
  if (!season) return null;

  await ensurePlayerProStats(playerId, espnPlayerId, year);

  const [seasonStat, teamTargets, proWeekStats, rosterWeeklyScores, posRank] =
    await Promise.all([
      prisma.playerSeasonStat.findUnique({
        where: {
          seasonId_playerId: {
            seasonId: season.id,
            playerId,
          },
        },
      }),
      teamTargetsForSeason(season.id, nflTeam),
      prisma.playerProWeekStat.findMany({
        where: { seasonId: season.id, playerId },
        orderBy: { weekNumber: "asc" },
      }),
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
      getPosRankForPlayer(season.id, playerId, position),
    ]);

  if (!seasonStat && proWeekStats.length === 0 && rosterWeeklyScores.length === 0) {
    return null;
  }

  const ownerByWeek = new Map<number, string>();
  for (const score of rosterWeeklyScores) {
    const ownerName = score.team?.owner.displayName;
    if (ownerName) {
      ownerByWeek.set(score.week.weekNumber, ownerName);
    }
  }

  const weeklySource =
    proWeekStats.length > 0
      ? proWeekStats.map((row) => ({
          weekNumber: row.weekNumber,
          fantasyPoints: row.fantasyPoints,
          ownerName: ownerByWeek.get(row.weekNumber) ?? "—",
          stats: statsFromJson(row.stats),
          weekLabel: formatWeekMatchupLabel(row.weekNumber, row.matchupLabel),
        }))
      : rosterWeeklyScores.map((score) => {
          const stats = statsFromJson(score.stats);
          return {
            weekNumber: score.week.weekNumber,
            fantasyPoints: score.fantasyPoints,
            ownerName: score.team?.owner.displayName ?? "—",
            stats,
            weekLabel: `Week ${score.week.weekNumber}`,
          };
        });

  const seasonStats = statsFromJson(seasonStat?.stats);
  const proWeeklyTotal = weeklySource.reduce(
    (total, line) => total + line.fantasyPoints,
    0,
  );
  const fantasyPointsTotal =
    seasonStat?.fantasyPointsTotal && seasonStat.fantasyPointsTotal > 0
      ? seasonStat.fantasyPointsTotal
      : proWeeklyTotal;

  const totals = buildDisplayStats(
    seasonStats,
    teamTargets,
    fantasyPointsTotal,
  );

  if (seasonStats.receptions != null || weeklySource.length > 0) {
    totals.games = weeklySource.filter(
      (line) =>
        line.fantasyPoints > 0 ||
        (line.stats.receptions ?? 0) > 0 ||
        (line.stats.targets ?? 0) > 0,
    ).length;
  }

  return {
    ownerName:
      weeklySource.find((line) => line.ownerName !== "—")?.ownerName ?? "—",
    totals,
    weekly: weeklySource,
    posRank,
    posRankLabel: formatPosRank(position, posRank),
  };
}

async function getPosRankForPlayer(
  seasonId: string,
  playerId: string,
  position: string,
) {
  const seasonStatRows = await prisma.playerSeasonStat.findMany({
    where: {
      seasonId,
      fantasyPointsTotal: { gt: 0 },
      player: { position },
    },
    select: {
      fantasyPointsTotal: true,
      player: { select: { id: true, position: true } },
    },
  });

  const ranks = buildPosRanks(
    seasonStatRows.map((row) => ({
      id: row.player.id,
      position: row.player.position,
      points: row.fantasyPointsTotal,
    })),
  );

  return ranks.get(playerId) ?? null;
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
        playerRecord.espnPlayerId,
        playerRecord.position,
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
