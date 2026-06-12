import "dotenv/config";
import {
  buildFinalRankMapFromEspn,
  getEspnAuthFromEnv,
  loadFinalRankMap,
  syncSeasonStandingsFromEspn,
} from "@/lib/import/team-standings";
import { prisma } from "@/lib/db";
import { getOwnerCareerStats } from "@/lib/services/stats";

async function main() {
  console.log("DATABASE_URL set:", Boolean(process.env.DATABASE_URL));

  const teams = await prisma.team.findMany({
    include: { owner: true, season: true },
    orderBy: [{ season: { year: "asc" } }, { espnTeamId: "asc" }],
  });

  console.log("\nDB teams (playoffSeed / finalRank):");
  for (const team of teams) {
    console.log(
      `  ${team.season.year} ${team.owner.displayName}: seed=${team.playoffSeed} finalRank=${team.finalRank} espnTeamId=${team.espnTeamId}`,
    );
  }

  const nullFinal = teams.filter((team) => team.finalRank == null).length;
  console.log(`\nTeams with null finalRank: ${nullFinal}/${teams.length}`);

  try {
    const auth = getEspnAuthFromEnv();
    for (const year of [2024, 2025]) {
      const updated = await syncSeasonStandingsFromEspn(year, auth);
      console.log(`Sync ${year}: updated ${updated} teams`);
    }

    const map = await buildFinalRankMapFromEspn(auth);
    console.log(`\nESPN finalRank map size: ${map.size}`);
    for (const [teamId, rank] of map) {
      const team = teams.find((entry) => entry.id === teamId);
      console.log(`  ${team?.owner.displayName} ${team?.season.year}: ${rank}`);
    }
  } catch (error) {
    console.error("ESPN sync error:", error);
  }

  await loadFinalRankMap();

  const teamsAfter = await prisma.team.findMany({
    include: { owner: true, season: true },
  });
  console.log("\nAfter loadFinalRankMap:");
  for (const team of teamsAfter) {
    console.log(
      `  ${team.season.year} ${team.owner.displayName}: finalRank=${team.finalRank}`,
    );
  }

  const stats = await getOwnerCareerStats();
  console.log("\nCareer average finishes:");
  for (const owner of stats) {
    console.log(`  ${owner.displayName}: avg=${owner.averageFinish ?? "—"}`);
  }

  await prisma.$disconnect();
}

main();
