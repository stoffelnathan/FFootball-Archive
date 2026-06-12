import { EspnClient } from "@/lib/espn/client";
import type { EspnTeam } from "@/lib/espn/types";
import { prisma } from "@/lib/db";

const DEFAULT_PLAYOFF_TEAM_COUNT = 6;

export function standingsFromEspnTeam(team: EspnTeam) {
  const raw = team as EspnTeam & {
    finalStandingsPosition?: number;
  };

  const playoffSeed =
    raw.playoffSeed && raw.playoffSeed > 0 ? raw.playoffSeed : null;
  const finalRank =
    raw.rankCalculatedFinal && raw.rankCalculatedFinal > 0
      ? raw.rankCalculatedFinal
      : raw.finalStandingsPosition && raw.finalStandingsPosition > 0
        ? raw.finalStandingsPosition
        : raw.rank && raw.rank > 0
          ? raw.rank
          : null;

  return { playoffSeed, finalRank };
}

export function madePlayoffs(
  playoffSeed: number | null,
  playoffTeamCount = DEFAULT_PLAYOFF_TEAM_COUNT,
): boolean {
  return playoffSeed != null && playoffSeed > 0 && playoffSeed <= playoffTeamCount;
}

export async function syncSeasonStandingsFromEspn(
  year: number,
  auth: { leagueId: number; espnS2?: string; swid?: string },
): Promise<number> {
  const client = new EspnClient(auth);
  const data = await client.fetchLeague(year, {
    views: ["mTeam", "mStandings"],
  });

  if (!data?.teams?.length) return 0;

  const season = await prisma.season.findFirst({ where: { year } });
  if (!season) return 0;

  const playoffTeamCount =
    data.settings?.scheduleSettings?.playoffTeamCount ??
    DEFAULT_PLAYOFF_TEAM_COUNT;

  let updated = 0;
  for (const team of data.teams) {
    const { playoffSeed, finalRank } = standingsFromEspnTeam(team);
    const result = await prisma.team.updateMany({
      where: { seasonId: season.id, espnTeamId: team.id },
      data: { playoffSeed, finalRank },
    });
    updated += result.count;
  }

  if (playoffTeamCount > 0) {
    try {
      await prisma.season.update({
        where: { id: season.id },
        data: { playoffTeamCount },
      });
    } catch (error) {
      console.warn(`Could not store playoffTeamCount for ${year}:`, error);
    }
  }

  return updated;
}

export async function buildFinalRankMapFromEspn(
  auth: { leagueId: number; espnS2?: string; swid?: string },
): Promise<Map<string, number>> {
  const ranks = new Map<string, number>();
  const dbTeams = await prisma.team.findMany({
    select: {
      id: true,
      espnTeamId: true,
      season: { select: { year: true } },
    },
  });

  const teamsByYear = new Map<number, typeof dbTeams>();
  for (const team of dbTeams) {
    const year = team.season.year;
    const list = teamsByYear.get(year) ?? [];
    list.push(team);
    teamsByYear.set(year, list);
  }

  const client = new EspnClient(auth);

  for (const [year, teams] of teamsByYear) {
    const data = await client.fetchLeague(year, {
      views: ["mTeam", "mStandings"],
    });

    for (const espnTeam of data?.teams ?? []) {
      const { finalRank } = standingsFromEspnTeam(espnTeam);
      if (!finalRank) continue;

      const dbTeam = teams.find((team) => team.espnTeamId === espnTeam.id);
      if (!dbTeam) continue;

      ranks.set(dbTeam.id, finalRank);
    }
  }

  return ranks;
}

export async function buildFinalRankMapFromDb(): Promise<Map<string, number>> {
  const teams = await prisma.team.findMany({
    select: { id: true, finalRank: true },
  });

  const ranks = new Map<string, number>();
  for (const team of teams) {
    if (team.finalRank != null && team.finalRank > 0) {
      ranks.set(team.id, team.finalRank);
    }
  }
  return ranks;
}

export function buildFinalRankMapFromRecords(
  teams: Array<{
    id: string;
    seasonId: string;
    wins: number;
    losses: number;
    ties: number;
    pointsFor: number;
  }>,
): Map<string, number> {
  const bySeason = new Map<string, typeof teams>();
  for (const team of teams) {
    const list = bySeason.get(team.seasonId) ?? [];
    list.push(team);
    bySeason.set(team.seasonId, list);
  }

  const ranks = new Map<string, number>();
  for (const seasonTeams of bySeason.values()) {
    const sorted = [...seasonTeams].sort(
      (a, b) =>
        b.wins - a.wins ||
        b.pointsFor - a.pointsFor ||
        a.losses - b.losses ||
        a.pointsFor - b.pointsFor,
    );

    sorted.forEach((team, index) => {
      ranks.set(team.id, index + 1);
    });
  }

  return ranks;
}

export async function persistFinalRankMap(
  rankMap: Map<string, number>,
): Promise<void> {
  await Promise.all(
    [...rankMap.entries()].map(([teamId, finalRank]) =>
      prisma.team.updateMany({
        where: { id: teamId },
        data: { finalRank },
      }),
    ),
  );
}

let cachedFinalRankMap: Map<string, number> = new Map();

export function getCachedFinalRankMap(): Map<string, number> {
  return cachedFinalRankMap;
}

export async function loadFinalRankMap(): Promise<Map<string, number>> {
  const teamCount = await prisma.team.count();
  const dbMap = await buildFinalRankMapFromDb();
  if (teamCount > 0 && dbMap.size >= teamCount) {
    cachedFinalRankMap = dbMap;
    return dbMap;
  }

  let auth: ReturnType<typeof getEspnAuthFromEnv> | null = null;
  try {
    auth = getEspnAuthFromEnv();
  } catch (error) {
    console.warn("Skipping ESPN standings sync:", error);
  }

  if (auth) {
    const seasons = await prisma.season.findMany({
      select: { year: true },
      orderBy: { year: "asc" },
    });

    for (const season of seasons) {
      await syncSeasonStandingsFromEspn(season.year, auth);
    }
  }

  let rankMap = auth ? await buildFinalRankMapFromEspn(auth) : new Map<string, number>();

  if (rankMap.size === 0) {
    rankMap = await buildFinalRankMapFromDb();
  }

  if (rankMap.size === 0) {
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        seasonId: true,
        wins: true,
        losses: true,
        ties: true,
        pointsFor: true,
      },
    });
    rankMap = buildFinalRankMapFromRecords(teams);
  }

  if (rankMap.size > 0) {
    await persistFinalRankMap(rankMap);
  }

  cachedFinalRankMap = rankMap;
  return rankMap;
}

export function getEspnAuthFromEnv() {
  const leagueId = Number(process.env.ESPN_LEAGUE_ID);
  if (!leagueId) {
    throw new Error("ESPN_LEAGUE_ID is not set");
  }

  return {
    leagueId,
    espnS2: process.env.ESPN_S2,
    swid: process.env.SWID,
  };
}

export function resolveFinalRank(
  teamId: string,
  dbFinalRank: number | null | undefined,
  rankMap: Map<string, number>,
): number | null {
  const rank = rankMap.get(teamId) ?? dbFinalRank ?? null;
  return rank != null && rank > 0 ? rank : null;
}
