import { prisma } from "@/lib/db";
import {
  computeHighestWeeklyScore,
  computeLongestWinStreak,
  getAllMatchupResults,
  getOwnerCareerStats,
} from "@/lib/services/stats";
import { getLeague } from "@/lib/services/league";
import { matchupLabel, ownerLabel } from "@/lib/format";
import { playerHref } from "@/lib/player-url";
import type { LeagueRecordEntry } from "@/lib/types";
import { formatRecord } from "@/lib/types";

export async function getSeasonsList() {
  const league = await getLeague();
  return league?.seasons ?? [];
}

export async function getSeasonByYear(year: number) {
  return prisma.season.findFirst({
    where: { year },
    include: {
      league: true,
      champion: true,
      runnerUp: true,
      teams: {
        include: { owner: true },
        orderBy: [{ wins: "desc" }, { pointsFor: "desc" }],
      },
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          matchups: {
            include: {
              homeTeam: { include: { owner: true } },
              awayTeam: { include: { owner: true } },
            },
          },
        },
      },
      draftPicks: {
        orderBy: { overallPick: "asc" },
        include: {
          player: true,
          team: { include: { owner: true } },
        },
      },
      awards: { include: { owner: true } },
    },
  });
}

export async function getHomepageData() {
  const [league, careerStats, matchupResults] = await Promise.all([
    getLeague(),
    getOwnerCareerStats(),
    getAllMatchupResults(),
  ]);

  const ownerMap = new Map(careerStats.map((owner) => [owner.ownerId, owner]));
  const longestStreak = computeLongestWinStreak(matchupResults);
  const highestScore = computeHighestWeeklyScore(matchupResults);

  const mostChampionships = [...careerStats].sort(
    (a, b) => b.championships - a.championships,
  )[0];
  const careerWinsLeader = [...careerStats].sort((a, b) => b.wins - a.wins)[0];

  return {
    leagueName: league?.name ?? "Fantasy League Archive",
    seasons: league?.seasons ?? [],
    championTimeline: (league?.seasons ?? [])
      .filter((season) => season.champion)
      .map((season) => ({
        year: season.year,
        champion: season.champion!.displayName,
        championId: season.championId!,
      })),
    highlights: {
      mostChampionships,
      careerWinsLeader,
      longestStreak: longestStreak
        ? {
            ...longestStreak,
            ownerName: ownerMap.get(longestStreak.ownerId)?.displayName ?? "Unknown",
          }
        : null,
      highestScore: highestScore
        ? {
            ...highestScore,
            ownerName: ownerMap.get(highestScore.ownerId)?.displayName ?? "Unknown",
          }
        : null,
    },
    careerLeaderboard: [...careerStats]
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10),
  };
}

export async function getLeagueRecords(): Promise<{
  weekly: LeagueRecordEntry[];
  season: LeagueRecordEntry[];
  career: LeagueRecordEntry[];
  draft: LeagueRecordEntry[];
}> {
  const [matchups, teams, owners, draftPicks, careerStats, matchupResults] =
    await Promise.all([
      prisma.matchup.findMany({
        include: {
          week: { include: { season: true } },
          homeTeam: { include: { owner: true } },
          awayTeam: { include: { owner: true } },
        },
      }),
      prisma.team.findMany({
        include: { owner: true, season: true },
      }),
      prisma.owner.findMany(),
      prisma.draftPick.findMany({
        include: {
          player: true,
          team: { include: { owner: true } },
          season: true,
        },
      }),
      getOwnerCareerStats(),
      getAllMatchupResults(),
    ]);

  const ownerName = (id: string) =>
    owners.find((owner) => owner.id === id)?.displayName ?? "Unknown";

  let highestWeekly: { entry: LeagueRecordEntry; score: number } | null = null;
  let lowestWeekly: { entry: LeagueRecordEntry; score: number } | null = null;
  let closest: LeagueRecordEntry | null = null;
  let blowout: LeagueRecordEntry | null = null;

  for (const result of matchupResults) {
    const scoreLabel = `${result.teamScore.toFixed(2)} pts (Week ${result.weekNumber}, ${result.seasonYear})`;
    const scoreEntry: LeagueRecordEntry = {
      label: ownerName(result.ownerId),
      value: scoreLabel,
      href: `/owners/${result.ownerId}`,
    };

    if (!highestWeekly || result.teamScore > highestWeekly.score) {
      highestWeekly = { entry: scoreEntry, score: result.teamScore };
    }
    if (!lowestWeekly || result.teamScore < lowestWeekly.score) {
      lowestWeekly = { entry: scoreEntry, score: result.teamScore };
    }
  }

  for (const matchup of matchups) {
    const margin = Math.abs(matchup.homeScore - matchup.awayScore);
    const label = matchupLabel(matchup.homeTeam, matchup.awayTeam);
    const detail = `Week ${matchup.week.weekNumber}, ${matchup.week.season.year} — ${matchup.homeScore.toFixed(2)}-${matchup.awayScore.toFixed(2)}`;
    const entry = { label, value: margin.toFixed(2), detail };

    if (!closest || margin < parseFloat(closest.value)) closest = entry;
    if (!blowout || margin > parseFloat(blowout.value)) blowout = entry;
  }

  const mostPoints = [...teams].sort((a, b) => b.pointsFor - a.pointsFor)[0];
  const mostAgainst = [...teams].sort((a, b) => b.pointsAgainst - a.pointsAgainst)[0];
  const bestRecord = [...teams].sort((a, b) => {
    const aPct = a.wins / Math.max(a.wins + a.losses, 1);
    const bPct = b.wins / Math.max(b.wins + b.losses, 1);
    return bPct - aPct || b.wins - a.wins;
  })[0];
  const worstRecord = [...teams].sort((a, b) => {
    const aPct = a.wins / Math.max(a.wins + a.losses, 1);
    const bPct = b.wins / Math.max(b.wins + b.losses, 1);
    return aPct - bPct || a.losses - b.losses;
  })[0];

  const draftValues = await Promise.all(
    draftPicks.map(async (pick) => {
      const seasonPoints = await prisma.weeklyPlayerScore.aggregate({
        where: {
          playerId: pick.playerId,
          week: { seasonId: pick.seasonId },
        },
        _sum: { fantasyPoints: true },
      });
      return {
        pick,
        seasonPoints: seasonPoints._sum.fantasyPoints ?? 0,
      };
    }),
  );

  const bestDraft = [...draftValues].sort((a, b) => b.seasonPoints - a.seasonPoints)[0];
  const worstDraft = [...draftValues]
    .filter((entry) => entry.pick.round >= 5)
    .sort((a, b) => a.seasonPoints - b.seasonPoints)[0];

  const mostChamps = [...careerStats].sort((a, b) => b.championships - a.championships)[0];
  const mostWins = [...careerStats].sort((a, b) => b.wins - a.wins)[0];
  const bestWinPct = [...careerStats].sort((a, b) => b.winPercentage - a.winPercentage)[0];
  const mostPlayoffs = [...careerStats].sort(
    (a, b) => b.playoffAppearances - a.playoffAppearances,
  )[0];

  return {
    weekly: [
      highestWeekly?.entry ?? { label: "N/A", value: "—" },
      lowestWeekly?.entry ?? { label: "N/A", value: "—" },
      closest ?? { label: "N/A", value: "—" },
      blowout ?? { label: "N/A", value: "—" },
    ],
    season: [
      {
        label: mostPoints ? ownerLabel(mostPoints.owner) : "N/A",
        value: `${mostPoints?.pointsFor.toFixed(2) ?? "—"} PF`,
        detail: mostPoints ? String(mostPoints.season.year) : undefined,
      },
      {
        label: mostAgainst ? ownerLabel(mostAgainst.owner) : "N/A",
        value: `${mostAgainst?.pointsAgainst.toFixed(2) ?? "—"} PA`,
        detail: mostAgainst ? String(mostAgainst.season.year) : undefined,
      },
      {
        label: bestRecord ? ownerLabel(bestRecord.owner) : "N/A",
        value: bestRecord
          ? formatRecord(bestRecord.wins, bestRecord.losses, bestRecord.ties)
          : "—",
        detail: bestRecord ? String(bestRecord.season.year) : undefined,
      },
      {
        label: worstRecord ? ownerLabel(worstRecord.owner) : "N/A",
        value: worstRecord
          ? formatRecord(worstRecord.wins, worstRecord.losses, worstRecord.ties)
          : "—",
        detail: worstRecord ? String(worstRecord.season.year) : undefined,
      },
    ],
    career: [
      {
        label: mostChamps?.displayName ?? "N/A",
        value: `${mostChamps?.championships ?? 0} titles`,
        href: mostChamps ? `/owners/${mostChamps.ownerId}` : undefined,
      },
      {
        label: mostWins?.displayName ?? "N/A",
        value: `${mostWins?.wins ?? 0} wins`,
        href: mostWins ? `/owners/${mostWins.ownerId}` : undefined,
      },
      {
        label: bestWinPct?.displayName ?? "N/A",
        value: `${((bestWinPct?.winPercentage ?? 0) * 100).toFixed(1)}%`,
        href: bestWinPct ? `/owners/${bestWinPct.ownerId}` : undefined,
      },
      {
        label: mostPlayoffs?.displayName ?? "N/A",
        value: `${mostPlayoffs?.playoffAppearances ?? 0} appearances`,
        href: mostPlayoffs ? `/owners/${mostPlayoffs.ownerId}` : undefined,
      },
    ],
    draft: [
      {
        label: bestDraft?.pick.player.name ?? "N/A",
        value: `${bestDraft?.seasonPoints.toFixed(2) ?? "—"} pts`,
        detail: bestDraft
          ? `Round ${bestDraft.pick.round}, ${bestDraft.pick.season.year}`
          : undefined,
        href: bestDraft ? playerHref(bestDraft.pick.player.espnPlayerId) : undefined,
      },
      {
        label: worstDraft?.pick.player.name ?? "N/A",
        value: `${worstDraft?.seasonPoints.toFixed(2) ?? "—"} pts`,
        detail: worstDraft
          ? `Round ${worstDraft.pick.round}, ${worstDraft.pick.season.year}`
          : undefined,
        href: worstDraft ? playerHref(worstDraft.pick.player.espnPlayerId) : undefined,
      },
    ],
  };
}
