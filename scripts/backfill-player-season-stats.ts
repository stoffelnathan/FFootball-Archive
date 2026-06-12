import "dotenv/config";
import { EspnClient } from "@/lib/espn/client";
import { upsertPlayerSeasonStatFromEspn } from "@/lib/import/player-season-stats";
import { syncNflTeamTargetTotals } from "@/lib/espn/nfl-team-stats";
import { prisma } from "@/lib/db";

async function backfillSeasonFromEspn(year: number) {
  const season = await prisma.season.findFirst({ where: { year } });
  if (!season) {
    console.log(`Season ${year} not in database, skipping`);
    return;
  }

  const client = new EspnClient({
    leagueId: Number(process.env.ESPN_LEAGUE_ID),
    espnS2: process.env.ESPN_S2,
    swid: process.env.SWID,
  });

  const finalWeek =
    (
      await client.fetchLeague(year, {
        views: ["mSettings", "mTeam"],
      })
    )?.status?.finalScoringPeriod ?? 17;

  const weekData = await client.fetchLeague(year, {
    views: ["mMatchup", "mRoster", "mTeam"],
    scoringPeriodId: finalWeek,
  });

  const pointsByEspnId = new Map<number, number>();
  let updated = 0;

  for (const team of weekData?.teams ?? []) {
    for (const entry of team.roster?.entries ?? []) {
      const espnPlayerId = entry.playerPoolEntry?.player?.id ?? entry.playerId;
      if (!espnPlayerId) continue;

      const seasonStatEntry = entry.playerPoolEntry?.player?.stats?.find(
        (stat) => stat.scoringPeriodId === 0 && stat.statSourceId === 0,
      );
      if (!seasonStatEntry?.stats) continue;

      if (seasonStatEntry.appliedTotal != null) {
        pointsByEspnId.set(espnPlayerId, seasonStatEntry.appliedTotal);
      }

      const player = await prisma.player.findUnique({
        where: { espnPlayerId },
      });
      if (!player) continue;

      await upsertPlayerSeasonStatFromEspn(
        season.id,
        player.id,
        seasonStatEntry.stats,
        seasonStatEntry.appliedTotal,
      );
      updated += 1;
    }
  }

  const activePlayers = await prisma.player.findMany({
    where: {
      weeklyScores: { some: { week: { seasonId: season.id } } },
    },
    select: { id: true, espnPlayerId: true },
  });

  let patched = 0;
  for (const player of activePlayers) {
    const points = pointsByEspnId.get(player.espnPlayerId);
    if (points == null) continue;

    const result = await prisma.playerSeasonStat.updateMany({
      where: { seasonId: season.id, playerId: player.id },
      data: {
        fantasyPointsTotal: points,
        fantasyPointsStarted: 0,
      },
    });
    patched += result.count;
  }

  await syncNflTeamTargetTotals(season.id, year);
  console.log(
    `${year}: refreshed ${updated} rows, patched ${patched} active player totals`,
  );
}

async function main() {
  for (const year of [2024, 2025]) {
    await backfillSeasonFromEspn(year);
  }

  for (const name of ["Jefferson", "Gibbs"]) {
    const player = await prisma.player.findFirst({
      where: { name: { contains: name, mode: "insensitive" } },
      include: {
        seasonStats: {
          where: { season: { year: 2025 } },
        },
      },
    });

    const row = player?.seasonStats[0];
    if (row) {
      console.log(
        `${player?.name} 2025: ${row.fantasyPointsTotal.toFixed(1)} pts`,
      );
    }
  }

  await prisma.$disconnect();
}

main();
