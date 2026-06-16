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

  const seasonYear = latestSeason?.year ?? new Date().getFullYear();

  if (!latestSeason) {
    return { seasonYear, players: [] };
  }

  const rows = await prisma.player.findMany({
    where: {
      position: { in: ["QB", "RB", "WR", "TE"] },
    },
    include: {
      seasonStats: {
        where: { seasonId: latestSeason.id },
        take: 1,
      },
    },
  });

  const poolPlayers = rows.map((player) => {
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
  });

  const players = buildMockDraftRankings(poolPlayers);

  return { seasonYear, players };
}
