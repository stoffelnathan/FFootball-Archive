import "dotenv/config";
import { loadFinalRankMap } from "@/lib/import/team-standings";
import { prisma } from "@/lib/db";

async function main() {
  const rankMap = await loadFinalRankMap();
  console.log(`Synced final ranks for ${rankMap.size} teams`);

  const teams = await prisma.team.findMany({
    include: { owner: true, season: true },
    orderBy: [{ season: { year: "asc" } }, { espnTeamId: "asc" }],
  });

  for (const team of teams) {
    console.log(
      `  ${team.season.year} ${team.owner.displayName}: finalRank=${team.finalRank}`,
    );
  }

  await prisma.$disconnect();
}

main();
