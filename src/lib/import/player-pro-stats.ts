import { parseEspnWeekStats } from "@/lib/espn/player-stats";
import {
  fetchFinalScoringPeriod,
  fetchPlayerCards,
  getEspnAuthFromEnv,
  getLeagueIdFromEnv,
  type PlayerCardEntry,
} from "@/lib/espn/player-card";
import {
  fetchProSchedule,
  formatNflMatchupLabel,
  type ProScheduleByTeam,
} from "@/lib/espn/pro-schedule";
import { upsertPlayerSeasonStatFromEspn } from "@/lib/import/player-season-stats";
import { prisma } from "@/lib/db";

function buildCookieHeader(): string | undefined {
  const auth = getEspnAuthFromEnv();
  if (!auth.espnS2 || !auth.swid) return undefined;
  return `espn_s2=${auth.espnS2}; SWID=${auth.swid}`;
}

async function upsertProWeekStatsForPlayer(
  seasonId: string,
  playerId: string,
  card: PlayerCardEntry,
  schedule: ProScheduleByTeam,
) {
  for (const weekStat of card.weeklyStats) {
    const weekNumber = weekStat.scoringPeriodId ?? 0;
    if (weekNumber <= 0) continue;

    const proTeamId = weekStat.proTeamId ?? card.player.proTeamId ?? null;
    const stats = parseEspnWeekStats(weekStat.stats);
    const fantasyPoints = weekStat.appliedTotal ?? 0;
    const matchupLabel = formatNflMatchupLabel(
      proTeamId,
      weekNumber,
      schedule,
    );

    await prisma.playerProWeekStat.upsert({
      where: {
        seasonId_playerId_weekNumber: {
          seasonId,
          playerId,
          weekNumber,
        },
      },
      create: {
        seasonId,
        playerId,
        weekNumber,
        fantasyPoints,
        stats,
        proTeamId,
        matchupLabel,
        espnGameId: weekStat.externalId ?? null,
      },
      update: {
        fantasyPoints,
        stats,
        proTeamId,
        matchupLabel,
        espnGameId: weekStat.externalId ?? null,
      },
    });
  }

  if (card.seasonStat?.stats) {
    await upsertPlayerSeasonStatFromEspn(
      seasonId,
      playerId,
      card.seasonStat.stats,
      card.seasonStat.appliedTotal,
    );
  }
}

export async function syncPlayerProStats(
  playerId: string,
  espnPlayerId: number,
  seasonYear: number,
): Promise<void> {
  const season = await prisma.season.findFirst({
    where: { year: seasonYear },
    select: { id: true },
  });
  if (!season) return;

  const auth = getEspnAuthFromEnv();
  const leagueId = getLeagueIdFromEnv();
  const finalScoringPeriod = await fetchFinalScoringPeriod(
    seasonYear,
    leagueId,
    auth,
  );
  const [cards, schedule] = await Promise.all([
    fetchPlayerCards(
      seasonYear,
      leagueId,
      [espnPlayerId],
      finalScoringPeriod,
      auth,
    ),
    fetchProSchedule(seasonYear, buildCookieHeader()),
  ]);

  const card = cards.get(espnPlayerId);
  if (!card) return;

  await upsertProWeekStatsForPlayer(season.id, playerId, card, schedule);
}

export async function syncPlayerProStatsBatch(
  seasonYear: number,
  players: Array<{ id: string; espnPlayerId: number }>,
  batchSize = 40,
): Promise<{ synced: number; skipped: number }> {
  const season = await prisma.season.findFirst({
    where: { year: seasonYear },
    select: { id: true },
  });
  if (!season) {
    return { synced: 0, skipped: players.length };
  }

  const auth = getEspnAuthFromEnv();
  const leagueId = getLeagueIdFromEnv();
  const finalScoringPeriod = await fetchFinalScoringPeriod(
    seasonYear,
    leagueId,
    auth,
  );
  const schedule = await fetchProSchedule(seasonYear, buildCookieHeader());

  let synced = 0;
  let skipped = 0;

  for (let index = 0; index < players.length; index += batchSize) {
    const batch = players.slice(index, index + batchSize);
    const cards = await fetchPlayerCards(
      seasonYear,
      leagueId,
      batch.map((player) => player.espnPlayerId),
      finalScoringPeriod,
      auth,
    );

    for (const player of batch) {
      const card = cards.get(player.espnPlayerId);
      if (!card) {
        skipped += 1;
        continue;
      }

      await upsertProWeekStatsForPlayer(season.id, player.id, card, schedule);
      synced += 1;
    }
  }

  return { synced, skipped };
}

export async function ensurePlayerProStats(
  playerId: string,
  espnPlayerId: number,
  seasonYear: number,
): Promise<void> {
  const season = await prisma.season.findFirst({
    where: { year: seasonYear },
    select: { id: true },
  });
  if (!season) return;

  const existing = await prisma.playerProWeekStat.count({
    where: { seasonId: season.id, playerId },
  });

  if (existing > 0) return;

  await syncPlayerProStats(playerId, espnPlayerId, seasonYear);
}

export type PlayerStatMismatch = {
  playerId: string;
  name: string;
  espnPlayerId: number;
  seasonYear: number;
  seasonTotal: number;
  weeklySum: number;
  proWeeklySum: number;
  proWeekCount: number;
  rosterWeekCount: number;
};

export async function findPlayerStatMismatches(
  seasonYear: number,
  tolerance = 0.05,
): Promise<PlayerStatMismatch[]> {
  const season = await prisma.season.findFirst({
    where: { year: seasonYear },
    select: { id: true },
  });
  if (!season) return [];

  const players = await prisma.player.findMany({
    where: {
      OR: [
        { seasonStats: { some: { seasonId: season.id } } },
        { proWeekStats: { some: { seasonId: season.id } } },
        { weeklyScores: { some: { week: { seasonId: season.id } } } },
      ],
    },
    include: {
      seasonStats: { where: { seasonId: season.id } },
      proWeekStats: { where: { seasonId: season.id } },
      weeklyScores: {
        where: { week: { seasonId: season.id } },
        select: { fantasyPoints: true },
      },
    },
  });

  const mismatches: PlayerStatMismatch[] = [];

  for (const player of players) {
    const seasonTotal = player.seasonStats[0]?.fantasyPointsTotal ?? 0;
    const proWeeklySum = player.proWeekStats.reduce(
      (total, row) => total + row.fantasyPoints,
      0,
    );
    const rosterWeeklySum = player.weeklyScores.reduce(
      (total, row) => total + row.fantasyPoints,
      0,
    );

    const reference = proWeeklySum > 0 ? proWeeklySum : rosterWeeklySum;
    if (reference <= 0) continue;

    if (
      Math.abs(seasonTotal - reference) > tolerance ||
      (player.proWeekStats.length === 0 && player.weeklyScores.length > 0)
    ) {
      mismatches.push({
        playerId: player.id,
        name: player.name,
        espnPlayerId: player.espnPlayerId,
        seasonYear,
        seasonTotal,
        weeklySum: rosterWeeklySum,
        proWeeklySum,
        proWeekCount: player.proWeekStats.length,
        rosterWeekCount: player.weeklyScores.length,
      });
    }
  }

  return mismatches.sort(
    (a, b) =>
      Math.abs(b.seasonTotal - b.proWeeklySum) -
      Math.abs(a.seasonTotal - a.proWeeklySum),
  );
}
