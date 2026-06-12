import { ESPN_BASE_URL, NFL_TEAM_NAMES } from "@/lib/espn/constants";

export type ProGame = {
  homeProTeamId: number;
  awayProTeamId: number;
  espnGameId: string;
};

export type ProScheduleByTeam = Map<number, Map<number, ProGame>>;

type ProScheduleResponse = {
  settings?: {
    proTeams?: Array<{
      id: number;
      proGamesByScoringPeriod?: Record<
        string,
        Array<{
          homeProTeamId: number;
          awayProTeamId: number;
          id: number;
          scoringPeriodId: number;
        }>
      >;
    }>;
  };
};

export function buildProScheduleMap(data: ProScheduleResponse): ProScheduleByTeam {
  const schedule: ProScheduleByTeam = new Map();

  for (const team of data.settings?.proTeams ?? []) {
    if (team.id === 0) continue;

    const weekMap = new Map<number, ProGame>();
    for (const [weekKey, games] of Object.entries(
      team.proGamesByScoringPeriod ?? {},
    )) {
      const game = games[0];
      if (!game) continue;
      weekMap.set(Number(weekKey), {
        homeProTeamId: game.homeProTeamId,
        awayProTeamId: game.awayProTeamId,
        espnGameId: String(game.id),
      });
    }

    schedule.set(team.id, weekMap);
  }

  return schedule;
}

export async function fetchProSchedule(
  seasonYear: number,
  cookieHeader?: string,
): Promise<ProScheduleByTeam> {
  const url = `${ESPN_BASE_URL}/seasons/${seasonYear}?view=proTeamSchedules_wl`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `ESPN pro schedule failed (${response.status}) for ${seasonYear}`,
    );
  }

  return buildProScheduleMap((await response.json()) as ProScheduleResponse);
}

export function formatNflMatchupLabel(
  proTeamId: number | null | undefined,
  weekNumber: number,
  schedule: ProScheduleByTeam,
): string | null {
  if (!proTeamId) return null;

  const game = schedule.get(proTeamId)?.get(weekNumber);
  if (!game) return null;

  const isHome = proTeamId === game.homeProTeamId;
  const opponentId = isHome ? game.awayProTeamId : game.homeProTeamId;
  const opponent = NFL_TEAM_NAMES[opponentId] ?? `TEAM_${opponentId}`;

  return isHome ? `vs ${opponent}` : `@ ${opponent}`;
}

export function formatWeekMatchupLabel(
  weekNumber: number,
  matchupLabel: string | null | undefined,
): string {
  if (!matchupLabel) return `Week ${weekNumber}`;
  return `Week ${weekNumber} ${matchupLabel}`;
}
