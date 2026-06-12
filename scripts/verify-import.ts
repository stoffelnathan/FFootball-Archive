import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const league = await prisma.league.findFirst({
    include: {
      seasons: {
        include: {
          teams: true,
          weeks: true,
          _count: { select: { draftPicks: true } },
        },
        orderBy: { year: "asc" },
      },
    },
  });

  console.log("League:", league?.name);
  for (const season of league?.seasons ?? []) {
    console.log(
      `  ${season.year}: ${season.teams.length} teams, ${season.weeks.length} weeks, ${season._count.draftPicks} draft picks`,
    );
  }

  console.log("Totals:", {
    owners: await prisma.owner.count(),
    matchups: await prisma.matchup.count(),
    rosterSnapshots: await prisma.weeklyRosterSnapshot.count(),
    playerScores: await prisma.weeklyPlayerScore.count(),
  });

  await prisma.$disconnect();
  await pool.end();
}

main();
