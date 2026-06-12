import "dotenv/config";
import { EspnClient } from "@/lib/espn/client";
import { prisma } from "@/lib/db";

async function backfillWeeklyPoints(year: number) {
  const season = await prisma.season.findFirst({
    where: { year },
    include: { weeks: { orderBy: { weekNumber: "asc" } } },
  });
  if (!season) {
    console.log(`Season ${year} not found`);
    return;
  }

  const teams = await prisma.team.findMany({
    where: { seasonId: season.id },
    select: { id: true, espnTeamId: true },
  });
  const teamIdByEspn = new Map(teams.map((team) => [team.espnTeamId, team.id]));

  const players = await prisma.player.findMany({
    select: { id: true, espnPlayerId: true },
  });
  const playerIdByEspn = new Map(
    players.map((player) => [player.espnPlayerId, player.id]),
  );

  const client = new EspnClient({
    leagueId: Number(process.env.ESPN_LEAGUE_ID),
    espnS2: process.env.ESPN_S2,
    swid: process.env.SWID,
  });

  let updated = 0;

  for (const week of season.weeks) {
    const data = await client.fetchLeague(year, {
      views: ["mMatchup", "mRoster", "mTeam"],
      scoringPeriodId: week.weekNumber,
    });

    for (const team of data?.teams ?? []) {
      const teamId = teamIdByEspn.get(team.id ?? -1);
      if (!teamId) continue;

      for (const entry of team.roster?.entries ?? []) {
        const espnPlayerId = entry.playerPoolEntry?.player?.id ?? entry.playerId;
        const playerId = espnPlayerId
          ? playerIdByEspn.get(espnPlayerId)
          : undefined;
        if (!playerId) continue;

        const weekStat = entry.playerPoolEntry?.player?.stats?.find(
          (stat) =>
            stat.scoringPeriodId === week.weekNumber && stat.statSourceId === 0,
        );
        const points = weekStat?.appliedTotal ?? 0;

        const result = await prisma.weeklyPlayerScore.updateMany({
          where: { weekId: week.id, teamId, playerId },
          data: { fantasyPoints: points },
        });
        updated += result.count;
      }
    }
  }

  console.log(`${year}: updated ${updated} weekly point rows`);
}

async function main() {
  for (const year of [2024, 2025]) {
    await backfillWeeklyPoints(year);
  }

  const gibbs = await prisma.player.findFirst({
    where: { name: { contains: "Gibbs", mode: "insensitive" } },
  });
  const season = await prisma.season.findFirst({ where: { year: 2025 } });
  if (gibbs && season) {
    const scores = await prisma.weeklyPlayerScore.findMany({
      where: { playerId: gibbs.id, week: { seasonId: season.id } },
      include: { week: true },
      orderBy: { week: { weekNumber: "asc" } },
    });
    const sum = scores.reduce((total, score) => total + score.fantasyPoints, 0);
    console.log(
      `Gibbs 2025 weekly sum: ${sum.toFixed(1)} (${scores.length} weeks)`,
    );
  }

  await prisma.$disconnect();
}

main();
