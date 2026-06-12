import { prisma } from "@/lib/db";
import { NFL_TEAM_NAMES } from "@/lib/espn/constants";

const ESPN_SITE_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams";

const ESPN_TEAM_ID_BY_ABBR = Object.fromEntries(
  Object.entries(NFL_TEAM_NAMES)
    .filter(([id]) => id !== "0")
    .map(([id, abbr]) => [abbr, Number(id)]),
) as Record<string, number>;

type EspnTeamStatsResponse = {
  results?: {
    stats?: {
      categories?: Array<{
        name?: string;
        stats?: Array<{ name?: string; value?: number }>;
      }>;
    };
  };
};

async function fetchTeamTargets(
  espnTeamId: number,
  seasonYear: number,
): Promise<number> {
  const url = `${ESPN_SITE_BASE}/${espnTeamId}/statistics?season=${seasonYear}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `ESPN team stats failed (${response.status}) for team ${espnTeamId} ${seasonYear}`,
    );
  }

  const data = (await response.json()) as EspnTeamStatsResponse;
  const receiving = data.results?.stats?.categories?.find(
    (category) => category.name === "receiving",
  );
  const targets = receiving?.stats?.find(
    (stat) => stat.name === "receivingTargets",
  );

  return Math.round(targets?.value ?? 0);
}

export async function fetchNflTeamTargetTotals(
  seasonYear: number,
): Promise<Map<string, number>> {
  const totals = new Map<string, number>();

  for (const [abbr, espnTeamId] of Object.entries(ESPN_TEAM_ID_BY_ABBR)) {
    try {
      const targets = await fetchTeamTargets(espnTeamId, seasonYear);
      totals.set(abbr, targets);
    } catch (error) {
      console.warn(`Could not fetch ${abbr} ${seasonYear} targets:`, error);
    }
  }

  return totals;
}

export async function syncNflTeamTargetTotals(
  seasonId: string,
  seasonYear: number,
): Promise<void> {
  const totals = await fetchNflTeamTargetTotals(seasonYear);

  for (const [nflTeam, targets] of totals) {
    await prisma.nflTeamSeasonStats.upsert({
      where: {
        seasonId_nflTeam: { seasonId, nflTeam },
      },
      create: { seasonId, nflTeam, targets },
      update: { targets },
    });
  }
}
