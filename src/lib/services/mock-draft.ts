import { prisma } from "@/lib/db";
import { buildMockDraftRankings } from "@/lib/mock-draft/rankings";
import type { MockDraftPlayer } from "@/lib/mock-draft/types";
import { type PlayerStatMap } from "@/lib/espn/player-stats";

function statsFromJson(value: unknown): PlayerStatMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as PlayerStatMap;
}

export async function getMockDraftPlayerPool(): Promise<{
  seasonYear: number;
  players: MockDraftPlayer[];
}> {
  const latestSeason = await prisma.season.findFirst({
    orderBy: { year: "desc" },
    select: { id: true, year: true },
  });

  if (!latestSeason) {
    return { seasonYear: new Date().getFullYear(), players: [] };
  }

  const rows = await prisma.player.findMany({
    where: {
      position: { in: ["QB", "RB", "WR", "TE"] },
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
    orderBy: { name: "asc" },
  });

  const rawPlayers = rows
    .map((player) => {
      const seasonStat = player.seasonStats[0];
      const stats = statsFromJson(seasonStat?.stats);
      return {
        id: player.id,
        espnPlayerId: player.espnPlayerId,
        name: player.name,
        position: player.position,
        nflTeam: player.nflTeam,
        leaguePoints: seasonStat?.fantasyPointsTotal ?? 0,
        receptions: stats.receptions ?? 0,
      };
    })
    .filter((player) => player.leaguePoints > 0);

  const players = buildMockDraftRankings(rawPlayers);

  return {
    seasonYear: latestSeason.year,
    players,
  };
}
