import { prisma } from "@/lib/db";
import { getOwnerCareerStats } from "@/lib/services/stats";
import { formatRecord } from "@/lib/types";

export async function getOwners() {
  const stats = await getOwnerCareerStats();
  return stats.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function getOwnerById(ownerId: string) {
  const [owner, stats] = await Promise.all([
    prisma.owner.findUnique({
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
    }),
    getOwnerCareerStats(),
  ]);

  if (!owner) return null;

  const career = stats.find((entry) => entry.ownerId === ownerId);
  return { owner, career };
}

export async function getTeamBySeason(ownerId: string, year: number) {
  return prisma.team.findFirst({
    where: { ownerId, season: { year } },
    include: {
      owner: true,
      season: true,
      rosterSnapshots: {
        include: {
          player: true,
          week: true,
        },
      },
    },
  });
}

export function formatOwnerRecord(
  wins: number,
  losses: number,
  ties = 0,
): string {
  return formatRecord(wins, losses, ties);
}
