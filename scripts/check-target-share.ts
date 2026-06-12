import "dotenv/config";
import { prisma } from "@/lib/db";
import {
  buildDisplayStats,
  teamTargetsForSeason,
} from "@/lib/import/player-season-stats";

async function show(name: string, year: number) {
  const player = await prisma.player.findFirst({
    where: { name: { contains: name, mode: "insensitive" } },
  });
  const season = await prisma.season.findFirst({ where: { year } });
  if (!player || !season) return;

  const seasonStat = await prisma.playerSeasonStat.findUnique({
    where: {
      seasonId_playerId: { seasonId: season.id, playerId: player.id },
    },
  });

  const teamTargets = await teamTargetsForSeason(season.id, player.nflTeam);
  const stats = seasonStat?.stats as Record<string, number>;
  const display = buildDisplayStats(
    stats ?? {},
    teamTargets,
    seasonStat?.fantasyPointsTotal ?? 0,
  );

  console.log(
    `${player.name} ${year}: rec ${stats?.receptions}, tgt ${stats?.targets}, share ${display.targetShare?.toFixed(1)}%, pts ${seasonStat?.fantasyPointsTotal?.toFixed(1)}`,
  );
}

async function main() {
  await show("Jefferson", 2025);
  await show("Jefferson", 2024);
  await show("Chase", 2024);
  await prisma.$disconnect();
}

main();
