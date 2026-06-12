import "dotenv/config";
import {
  findPlayerStatMismatches,
  syncPlayerProStats,
  syncPlayerProStatsBatch,
} from "@/lib/import/player-pro-stats";
import { prisma } from "@/lib/db";

async function syncSeason(year: number, nameFilter?: string) {
  const players = await prisma.player.findMany({
    where: nameFilter
      ? { name: { contains: nameFilter, mode: "insensitive" } }
      : {
          OR: [
            { seasonStats: { some: { season: { year } } } },
            { weeklyScores: { some: { week: { season: { year } } } } },
            { proWeekStats: { some: { season: { year } } } },
          ],
        },
    select: { id: true, espnPlayerId: true, name: true },
    orderBy: { name: "asc" },
  });

  console.log(`Syncing ${players.length} players for ${year}...`);
  const result = await syncPlayerProStatsBatch(year, players);
  console.log(`${year}: synced ${result.synced}, skipped ${result.skipped}`);
}

async function auditSeason(year: number) {
  const mismatches = await findPlayerStatMismatches(year);
  console.log(`\n${year} mismatches: ${mismatches.length}`);
  for (const row of mismatches.slice(0, 20)) {
    console.log(
      `  ${row.name}: season=${row.seasonTotal.toFixed(2)} proWeeks=${row.proWeekCount} proSum=${row.proWeeklySum.toFixed(2)} rosterWeeks=${row.rosterWeekCount}`,
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? "sync";
  const yearArg = args.find((arg) => /^\d{4}$/.test(arg));
  const years = yearArg ? [Number(yearArg)] : [2024, 2025];
  const nameArg =
    command === "player"
      ? args
          .slice(1)
          .filter((arg) => !/^\d{4}$/.test(arg))
          .join(" ")
          .trim() || undefined
      : args.find((arg) => !/^\d{4}$/.test(arg) && arg !== command);

  if (command === "audit") {
    for (const year of years) {
      await auditSeason(year);
    }
    await prisma.$disconnect();
    return;
  }

  if (command === "player" && nameArg) {
    const player = await prisma.player.findFirst({
      where: { name: { contains: nameArg, mode: "insensitive" } },
    });
    if (!player) {
      console.log(`Player not found: ${nameArg}`);
      await prisma.$disconnect();
      return;
    }

    for (const year of years) {
      await syncPlayerProStats(player.id, player.espnPlayerId, year);
      const season = await prisma.season.findFirst({ where: { year } });
      if (!season) continue;

      const [seasonStat, proWeeks] = await Promise.all([
        prisma.playerSeasonStat.findUnique({
          where: {
            seasonId_playerId: {
              seasonId: season.id,
              playerId: player.id,
            },
          },
        }),
        prisma.playerProWeekStat.findMany({
          where: { seasonId: season.id, playerId: player.id },
          orderBy: { weekNumber: "asc" },
        }),
      ]);

      const sum = proWeeks.reduce((total, row) => total + row.fantasyPoints, 0);
      console.log(
        `${player.name} ${year}: season=${seasonStat?.fantasyPointsTotal?.toFixed(2) ?? "—"} proWeeks=${proWeeks.length} sum=${sum.toFixed(2)}`,
      );
      console.log(
        proWeeks
          .map((row) => `W${row.weekNumber} ${row.matchupLabel ?? ""} ${row.fantasyPoints.toFixed(2)}`)
          .join("\n"),
      );
    }

    await prisma.$disconnect();
    return;
  }

  for (const year of years) {
    await syncSeason(year, nameArg);
    await auditSeason(year);
  }

  await prisma.$disconnect();
}

main();
