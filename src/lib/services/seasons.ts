import { prisma } from "@/lib/db";
import {
  computeLongestWinStreaks,
  getAllMatchupResults,
  getOwnerCareerStats,
  getTopTied,
  uniqueHighestWeeklyScores,
} from "@/lib/services/stats";
import { getLeague } from "@/lib/services/league";
import { matchupLabel, ownerLabel } from "@/lib/format";
import { playerHref } from "@/lib/player-url";
import type { LeagueRecordEntry, OwnerCareerStats } from "@/lib/types";
import { formatRecord } from "@/lib/types";

function tiedOwnerRecord(
  owners: OwnerCareerStats[],
  value: string,
): LeagueRecordEntry {
  if (owners.length === 0) {
    return { label: "N/A", value: "—" };
  }

  return {
    label: owners.map((owner) => owner.displayName).join(", "),
    value,
    links:
      owners.length > 1
        ? owners.map((owner) => ({
            label: owner.displayName,
            href: `/owners/${owner.ownerId}`,
          }))
        : undefined,
    href: owners.length === 1 ? `/owners/${owners[0].ownerId}` : undefined,
  };
}

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
  const streakLeaders = computeLongestWinStreaks(matchupResults);
  const scoreLeaders = uniqueHighestWeeklyScores(matchupResults);
  const championshipLeaders = getTopTied(
    careerStats,
    (owner) => owner.championships,
  ).filter((owner) => owner.championships > 0);
  const winsLeaders = getTopTied(careerStats, (owner) => owner.wins).filter(
    (owner) => owner.wins > 0,
  );

  const highestScore = scoreLeaders[0] ?? null;

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
      championshipLeaders,
      winsLeaders,
      streakLeaders: streakLeaders.map((entry) => ({
        ...entry,
        ownerName: ownerMap.get(entry.ownerId)?.displayName ?? "Unknown",
      })),
      scoreLeaders: scoreLeaders.map((entry) => ({
        ...entry,
        ownerName: ownerMap.get(entry.ownerId)?.displayName ?? "Unknown",
      })),
      highestScore: highestScore
        ? {
            ...highestScore,
            ownerName:
              ownerMap.get(highestScore.ownerId)?.displayName ?? "Unknown",
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

  if (highestWeekly) {
    const tiedScores = uniqueHighestWeeklyScores(matchupResults);
    highestWeekly.entry = {
      label: tiedScores.map((entry) => ownerName(entry.ownerId)).join(", "),
      value: `${highestWeekly.score.toFixed(2)} pts`,
      detail:
        tiedScores.length === 1
          ? `Week ${tiedScores[0].weekNumber}, ${tiedScores[0].seasonYear}`
          : tiedScores
              .map(
                (entry) =>
                  `${ownerName(entry.ownerId)} — Week ${entry.weekNumber}, ${entry.seasonYear}`,
              )
              .join("; "),
      links:
        tiedScores.length > 1
          ? tiedScores.map((entry) => ({
              label: ownerName(entry.ownerId),
              href: `/owners/${entry.ownerId}`,
            }))
          : undefined,
      href:
        tiedScores.length === 1
          ? `/owners/${tiedScores[0].ownerId}`
          : undefined,
    };
  }

  for (const matchup of matchups) {
    const margin = Math.abs(matchup.homeScore - matchup.awayScore);
    const label = matchupLabel(matchup.homeTeam, matchup.awayTeam);
    const detail = `Week ${matchup.week.weekNumber}, ${matchup.week.season.year} — ${matchup.homeScore.toFixed(2)}-${matchup.awayScore.toFixed(2)}`;
    const entry = { label, value: margin.toFixed(2), detail };

    if (!closest || margin < parseFloat(closest.value)) closest = entry;
    if (!blowout || margin > parseFloat(blowout.value)) blowout = entry;
  }

  const mostPointsLeaders = getTopTied(teams, (team) => team.pointsFor);
  const mostAgainstLeaders = getTopTied(teams, (team) => team.pointsAgainst);

  const worstRecordSorted = [...teams].sort((a, b) => {
    const aPct = a.wins / Math.max(a.wins + a.losses, 1);
    const bPct = b.wins / Math.max(b.wins + b.losses, 1);
    return aPct - bPct || a.losses - b.losses;
  });
  const worstWinPct =
    worstRecordSorted.length > 0
      ? worstRecordSorted[0].wins /
        Math.max(
          worstRecordSorted[0].wins + worstRecordSorted[0].losses,
          1,
        )
      : 0;
  const worstRecordLeadersFixed = worstRecordSorted.filter((team) => {
    const pct = team.wins / Math.max(team.wins + team.losses, 1);
    return pct === worstWinPct;
  });

  const bestRecordSorted = [...teams].sort((a, b) => {
    const aPct = a.wins / Math.max(a.wins + a.losses, 1);
    const bPct = b.wins / Math.max(b.wins + b.losses, 1);
    return bPct - aPct || b.wins - a.wins;
  });
  const bestWinPct =
    bestRecordSorted.length > 0
      ? bestRecordSorted[0].wins /
        Math.max(bestRecordSorted[0].wins + bestRecordSorted[0].losses, 1)
      : 0;
  const bestRecordLeadersFixed = bestRecordSorted.filter((team) => {
    const pct = team.wins / Math.max(team.wins + team.losses, 1);
    return pct === bestWinPct;
  });

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

  const championshipLeaders = getTopTied(
    careerStats,
    (owner) => owner.championships,
  ).filter((owner) => owner.championships > 0);
  const winsLeaders = getTopTied(careerStats, (owner) => owner.wins).filter(
    (owner) => owner.wins > 0,
  );
  const winPctLeaders = getTopTied(
    careerStats,
    (owner) => owner.winPercentage,
  ).filter((owner) => owner.seasonsPlayed > 0);
  const playoffLeaders = getTopTied(
    careerStats,
    (owner) => owner.playoffAppearances,
  ).filter((owner) => owner.playoffAppearances > 0);

  return {
    weekly: [
      highestWeekly?.entry ?? { label: "N/A", value: "—" },
      lowestWeekly?.entry ?? { label: "N/A", value: "—" },
      closest ?? { label: "N/A", value: "—" },
      blowout ?? { label: "N/A", value: "—" },
    ],
    season: [
      {
        label:
          mostPointsLeaders.length > 0
            ? mostPointsLeaders.map((team) => ownerLabel(team.owner)).join(", ")
            : "N/A",
        value:
          mostPointsLeaders.length > 0
            ? `${mostPointsLeaders[0].pointsFor.toFixed(2)} PF`
            : "—",
        detail:
          mostPointsLeaders.length > 0
            ? mostPointsLeaders
                .map((team) => `${ownerLabel(team.owner)} (${team.season.year})`)
                .join(", ")
            : undefined,
      },
      {
        label:
          mostAgainstLeaders.length > 0
            ? mostAgainstLeaders.map((team) => ownerLabel(team.owner)).join(", ")
            : "N/A",
        value:
          mostAgainstLeaders.length > 0
            ? `${mostAgainstLeaders[0].pointsAgainst.toFixed(2)} PA`
            : "—",
        detail:
          mostAgainstLeaders.length > 0
            ? mostAgainstLeaders
                .map((team) => `${ownerLabel(team.owner)} (${team.season.year})`)
                .join(", ")
            : undefined,
      },
      {
        label:
          bestRecordLeadersFixed.length > 0
            ? bestRecordLeadersFixed
                .map((team) => ownerLabel(team.owner))
                .join(", ")
            : "N/A",
        value: bestRecordLeadersFixed[0]
          ? formatRecord(
              bestRecordLeadersFixed[0].wins,
              bestRecordLeadersFixed[0].losses,
              bestRecordLeadersFixed[0].ties,
            )
          : "—",
        detail: bestRecordLeadersFixed[0]
          ? String(bestRecordLeadersFixed[0].season.year)
          : undefined,
      },
      {
        label:
          worstRecordLeadersFixed.length > 0
            ? worstRecordLeadersFixed
                .map((team) => ownerLabel(team.owner))
                .join(", ")
            : "N/A",
        value: worstRecordLeadersFixed[0]
          ? formatRecord(
              worstRecordLeadersFixed[0].wins,
              worstRecordLeadersFixed[0].losses,
              worstRecordLeadersFixed[0].ties,
            )
          : "—",
        detail: worstRecordLeadersFixed[0]
          ? String(worstRecordLeadersFixed[0].season.year)
          : undefined,
      },
    ],
    career: [
      tiedOwnerRecord(
        championshipLeaders,
        `${championshipLeaders[0]?.championships ?? 0} titles`,
      ),
      tiedOwnerRecord(winsLeaders, `${winsLeaders[0]?.wins ?? 0} wins`),
      tiedOwnerRecord(
        winPctLeaders,
        `${((winPctLeaders[0]?.winPercentage ?? 0) * 100).toFixed(1)}%`,
      ),
      tiedOwnerRecord(
        playoffLeaders,
        `${playoffLeaders[0]?.playoffAppearances ?? 0} appearances`,
      ),
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
