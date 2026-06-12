import { ESPN_BASE_URL } from "@/lib/espn/constants";
import type { EspnPlayer, EspnPlayerStatEntry } from "@/lib/espn/types";

export type PlayerCardEntry = {
  player: EspnPlayer;
  actualStats: EspnPlayerStatEntry[];
  seasonStat: EspnPlayerStatEntry | null;
  weeklyStats: EspnPlayerStatEntry[];
};

function buildCookieHeader(espnS2?: string, swid?: string): string | undefined {
  if (!espnS2 || !swid) return undefined;
  return `espn_s2=${espnS2}; SWID=${swid}`;
}

function parsePlayerCardEntry(raw: {
  player?: EspnPlayer;
}): PlayerCardEntry | null {
  const player = raw.player;
  if (!player?.id) return null;

  const actualStats = (player.stats ?? []).filter(
    (stat) => stat.statSourceId === 0,
  );
  const seasonStat =
    actualStats.find((stat) => stat.scoringPeriodId === 0) ?? null;
  const weeklyStats = actualStats
    .filter((stat) => (stat.scoringPeriodId ?? 0) > 0)
    .sort((a, b) => (a.scoringPeriodId ?? 0) - (b.scoringPeriodId ?? 0));

  return { player, actualStats, seasonStat, weeklyStats };
}

export async function fetchPlayerCards(
  seasonYear: number,
  leagueId: number,
  espnPlayerIds: number[],
  finalScoringPeriod: number,
  auth?: { espnS2?: string; swid?: string },
): Promise<Map<number, PlayerCardEntry>> {
  if (espnPlayerIds.length === 0) return new Map();

  const url = `${ESPN_BASE_URL}/seasons/${seasonYear}/segments/0/leagues/${leagueId}?view=kona_playercard`;
  const filters = {
    players: {
      filterIds: { value: espnPlayerIds },
      filterStatsForTopScoringPeriodIds: {
        value: finalScoringPeriod,
        additionalValue: [`00${seasonYear}`, `10${seasonYear}`],
      },
    },
  };

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "x-fantasy-filter": JSON.stringify(filters),
      ...(buildCookieHeader(auth?.espnS2, auth?.swid)
        ? { Cookie: buildCookieHeader(auth?.espnS2, auth?.swid) }
        : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `ESPN player card failed (${response.status}) for ${seasonYear}: ${body.slice(0, 200)}`,
    );
  }

  const data = (await response.json()) as {
    players?: Array<{ player?: EspnPlayer }>;
  };

  const entries = new Map<number, PlayerCardEntry>();
  for (const row of data.players ?? []) {
    const parsed = parsePlayerCardEntry(row);
    if (parsed) {
      entries.set(parsed.player.id!, parsed);
    }
  }

  return entries;
}

export async function fetchFinalScoringPeriod(
  seasonYear: number,
  leagueId: number,
  auth?: { espnS2?: string; swid?: string },
): Promise<number> {
  const url = `${ESPN_BASE_URL}/seasons/${seasonYear}/segments/0/leagues/${leagueId}?view=mSettings`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(buildCookieHeader(auth?.espnS2, auth?.swid)
        ? { Cookie: buildCookieHeader(auth?.espnS2, auth?.swid) }
        : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return 17;
  }

  const data = (await response.json()) as {
    status?: { finalScoringPeriod?: number };
  };

  return data.status?.finalScoringPeriod ?? 17;
}

export function getEspnAuthFromEnv() {
  return {
    espnS2: process.env.ESPN_S2,
    swid: process.env.SWID,
  };
}

export function getLeagueIdFromEnv(): number {
  return Number(process.env.ESPN_LEAGUE_ID);
}
