import { prisma } from "@/lib/db";
import {
  finalizeSeasonStats,
  parseEspnWeekStats,
  type PlayerStatMap,
} from "@/lib/espn/player-stats";

export async function teamTargetsForSeason(
  seasonId: string,
  nflTeam: string | null,
): Promise<number> {
  if (!nflTeam) return 0;

  const row = await prisma.nflTeamSeasonStats.findUnique({
    where: {
      seasonId_nflTeam: { seasonId, nflTeam },
    },
  });

  return row?.targets ?? 0;
}

export async function upsertPlayerSeasonStatFromEspn(
  seasonId: string,
  playerId: string,
  rawStats: Record<string, number> | undefined,
  fantasyPoints?: number,
) {
  if (!rawStats) return;

  const stats = parseEspnWeekStats(rawStats);
  if (Object.keys(stats).length === 0 && fantasyPoints == null) return;

  await prisma.playerSeasonStat.upsert({
    where: { seasonId_playerId: { seasonId, playerId } },
    create: {
      seasonId,
      playerId,
      stats,
      fantasyPointsTotal: fantasyPoints ?? 0,
      fantasyPointsStarted: 0,
    },
    update: {
      stats,
      fantasyPointsStarted: 0,
      ...(fantasyPoints != null ? { fantasyPointsTotal: fantasyPoints } : {}),
    },
  });
}

export function buildDisplayStats(
  seasonStats: PlayerStatMap,
  teamTargets: number,
  fantasyPoints: number,
): PlayerStatMap {
  const totals = finalizeSeasonStats(seasonStats, teamTargets);
  totals.fantasyPoints = fantasyPoints;
  return totals;
}
