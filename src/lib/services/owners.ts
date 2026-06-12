import { prisma } from "@/lib/db";
import {
  getCachedFinalRankMap,
  resolveFinalRank,
} from "@/lib/import/team-standings";
import { getOwnerCareerStats } from "@/lib/services/stats";
import { formatRecord } from "@/lib/types";

export async function getOwners() {
  const stats = await getOwnerCareerStats();
  return stats.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function getOwnerById(ownerId: string) {
  const stats = await getOwnerCareerStats();
  const owner = await prisma.owner.findUnique({
    where: { id: ownerId },
    include: {
      teams: {
        include: { season: true },
        orderBy: { season: { year: "desc" } },
      },
      championOf: { orderBy: { year: "desc" } },
      runnerUpOf: { orderBy: { year: "desc" } },
      awards: {
        include: { season: true },
        orderBy: { season: { year: "desc" } },
      },
    },
  });

  if (!owner) return null;

  const career = stats.find((entry) => entry.ownerId === ownerId);
  const finalRankByTeamId = getCachedFinalRankMap();
  return { owner, career, finalRankByTeamId };
}

export async function getOwnerSeasonProfile(ownerId: string, year: number) {
  const team = await prisma.team.findFirst({
    where: { ownerId, season: { year } },
    include: {
      owner: true,
      season: {
        include: {
          weeks: { orderBy: { weekNumber: "asc" } },
        },
      },
    },
  });

  if (!team) return null;

  const teamRecord = team;
  const regularWeeks = teamRecord.season.weeks.filter((week) => !week.isPlayoff);
  const openingWeek =
    teamRecord.season.weeks.find((week) => week.weekNumber === 1) ??
    regularWeeks[0] ??
    teamRecord.season.weeks[0];
  const closingWeek =
    regularWeeks.find((week) => week.weekNumber === 17) ??
    regularWeeks.at(-1) ??
    teamRecord.season.weeks.at(-1);

  async function loadRoster(weekId: string | undefined) {
    if (!weekId) return [];

    const snapshots = await prisma.weeklyRosterSnapshot.findMany({
      where: { teamId: teamRecord.id, weekId },
      include: { player: true },
      orderBy: [{ starter: "desc" }, { lineupSlot: "asc" }],
    });

    const playerIds = snapshots.map((entry) => entry.playerId);
    const seasonStats = playerIds.length
      ? await prisma.playerSeasonStat.findMany({
          where: {
            seasonId: teamRecord.seasonId,
            playerId: { in: playerIds },
          },
        })
      : [];
    const pointsByPlayer = new Map(
      seasonStats.map((row) => [row.playerId, row.fantasyPointsTotal]),
    );

    return snapshots.map((entry) => ({
      id: entry.id,
      starter: entry.starter,
      lineupSlot: entry.lineupSlot,
      seasonPoints: pointsByPlayer.get(entry.playerId) ?? 0,
      player: entry.player,
    }));
  }

  const [openingRoster, closingRoster] = await Promise.all([
    loadRoster(openingWeek?.id),
    loadRoster(closingWeek?.id),
  ]);

  return {
    team: teamRecord,
    owner: teamRecord.owner,
    season: teamRecord.season,
    openingWeek,
    closingWeek,
    openingRoster,
    closingRoster,
  };
}

export function formatOwnerRecord(
  wins: number,
  losses: number,
  ties = 0,
): string {
  return formatRecord(wins, losses, ties);
}
