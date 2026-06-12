import "dotenv/config";
import {
  findPlayerStatMismatches,
  syncPlayerProStatsBatch,
} from "@/lib/import/player-pro-stats";
import { prisma } from "@/lib/db";

async function main() {
  for (const year of [2024, 2025]) {
    const players = await prisma.player.findMany({
      where: {
        OR: [
          { seasonStats: { some: { season: { year } } } },
          { weeklyScores: { some: { week: { season: { year } } } } },
        ],
      },
      select: { id: true, espnPlayerId: true },
    });

    console.log(`Refreshing pro stats for ${players.length} ${year} players...`);
    await syncPlayerProStatsBatch(year, players);

    const mismatches = await findPlayerStatMismatches(year);
    console.log(`${year}: ${mismatches.length} remaining mismatches`);
  }

  await prisma.$disconnect();
}

main();
