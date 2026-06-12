import {
  DEFAULT_IMPORT_START_YEAR,
  LINEUP_SLOT_NAMES,
  NFL_TEAM_NAMES,
  POSITION_NAMES,
} from "@/lib/espn/constants";
import { parseEspnWeekStats } from "@/lib/espn/player-stats";
import { EspnClient } from "@/lib/espn/client";
import { syncNflTeamTargetTotals } from "@/lib/espn/nfl-team-stats";
import type {
  EspnLeagueResponse,
  EspnPlayer,
  EspnRosterEntry,
  EspnTeam,
} from "@/lib/espn/types";
import { resolveSeasonChampions } from "@/lib/import/champions";
import {
  upsertPlayerSeasonStatFromEspn,
} from "@/lib/import/player-season-stats";
import { prisma } from "@/lib/db";

export interface ImportOptions {
  leagueId: number;
  espnS2?: string;
  swid?: string;
  years?: number[];
  startYear?: number;
  endYear?: number;
}

export interface ImportSummary {
  yearsImported: number[];
  yearsSkipped: number[];
}

function teamDisplayName(team: EspnTeam): string {
  const location = team.location?.trim() ?? "";
  const nickname = team.nickname?.trim() ?? "";
  const combined = `${location} ${nickname}`.trim();
  return combined || team.abbrev || `Team ${team.id}`;
}

function memberDisplayName(
  memberId: string,
  members: EspnLeagueResponse["members"],
): string {
  const member = members?.find((entry) => entry.id === memberId);
  if (member?.firstName || member?.lastName) {
    const fullName = `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim();
    if (fullName) {
      return fullName;
    }
  }
  if (member?.displayName && !/^espn?fan/i.test(member.displayName)) {
    return member.displayName;
  }
  return memberId;
}

function playerPosition(player: EspnPlayer): string {
  if (player.defaultPositionId == null) {
    return "UNKNOWN";
  }
  return POSITION_NAMES[player.defaultPositionId] ?? `POS_${player.defaultPositionId}`;
}

function playerNflTeam(player: EspnPlayer): string | null {
  if (player.proTeamId == null) {
    return null;
  }
  return NFL_TEAM_NAMES[player.proTeamId] ?? `TEAM_${player.proTeamId}`;
}

function lineupSlotName(slotId?: number): string {
  if (slotId == null) {
    return "UNKNOWN";
  }
  return LINEUP_SLOT_NAMES[slotId] ?? `SLOT_${slotId}`;
}

function isStarterSlot(slotId?: number): boolean {
  if (slotId == null) {
    return false;
  }
  return slotId !== 20 && slotId !== 21;
}

export class SeasonImporter {
  private readonly client: EspnClient;

  constructor(private readonly options: ImportOptions) {
    this.client = new EspnClient({
      leagueId: options.leagueId,
      espnS2: options.espnS2,
      swid: options.swid,
    });
  }

  async importAll(): Promise<ImportSummary> {
    const endYear = this.options.endYear ?? new Date().getFullYear();
    const startYear = this.options.startYear ?? DEFAULT_IMPORT_START_YEAR;

    const years =
      this.options.years ??
      (await this.client.discoverSeasonYears(startYear, endYear));

    const yearsImported: number[] = [];
    const yearsSkipped: number[] = [];

    for (const year of years) {
      try {
        await this.importSeason(year);
        yearsImported.push(year);
        console.log(`Imported season ${year}`);
      } catch (error) {
        yearsSkipped.push(year);
        console.error(`Failed to import season ${year}:`, error);
      }
    }

    return { yearsImported, yearsSkipped };
  }

  async importSeason(year: number): Promise<void> {
    const base = await this.client.fetchLeague(year, {
      views: ["mSettings", "mTeam", "mDraftDetail", "mStandings"],
    });

    if (!base?.teams?.length) {
      throw new Error(`No teams found for ${year}`);
    }

    const league = await prisma.league.upsert({
      where: { espnLeagueId: this.options.leagueId },
      create: {
        espnLeagueId: this.options.leagueId,
        name: base.settings?.name ?? `League ${this.options.leagueId}`,
      },
      update: {
        name: base.settings?.name ?? `League ${this.options.leagueId}`,
      },
    });

    const ownerMap = await this.syncOwners(base);
    const season = await this.syncSeason(league.id, year, base);
    const teamMap = await this.syncTeams(season.id, base, ownerMap);

    await this.syncDraft(season.id, base, teamMap);
    await this.syncWeeksAndMatchups(season.id, year, base, teamMap);
    await this.syncTransactions(season.id, year, teamMap);
    await syncNflTeamTargetTotals(season.id, year);
    await this.syncChampionAndRunnerUp(season.id, year);
  }

  private async syncOwners(base: EspnLeagueResponse): Promise<Map<string, string>> {
    const ownerMap = new Map<string, string>();

    for (const team of base.teams ?? []) {
      const memberId = team.owners?.[0];
      if (!memberId) {
        continue;
      }

      const displayName = memberDisplayName(memberId, base.members);
      const owner = await prisma.owner.upsert({
        where: { espnMemberId: memberId },
        create: {
          espnMemberId: memberId,
          displayName,
        },
        update: {
          displayName,
        },
      });

      ownerMap.set(memberId, owner.id);
    }

    return ownerMap;
  }

  private async syncSeason(
    leagueId: string,
    year: number,
    base: EspnLeagueResponse,
  ) {
    const regularSeasonWeeks =
      base.settings?.scheduleSettings?.matchupPeriodCount ?? null;
    const playoffTeamCount =
      base.settings?.scheduleSettings?.playoffTeamCount ?? 0;
    const playoffMatchupLength =
      base.settings?.scheduleSettings?.playoffMatchupPeriodLength ?? 1;
    const playoffWeeks =
      playoffTeamCount > 0
        ? Math.ceil(Math.log2(playoffTeamCount)) * playoffMatchupLength
        : 0;

    return prisma.season.upsert({
      where: {
        leagueId_year: {
          leagueId,
          year,
        },
      },
      create: {
        leagueId,
        year,
        regularSeasonWeeks,
        playoffWeeks,
      },
      update: {
        regularSeasonWeeks,
        playoffWeeks,
      },
    });
  }

  private async syncTeams(
    seasonId: string,
    base: EspnLeagueResponse,
    ownerMap: Map<string, string>,
  ): Promise<Map<number, string>> {
    const teamMap = new Map<number, string>();

    for (const team of base.teams ?? []) {
      const memberId = team.owners?.[0];
      const ownerId = memberId ? ownerMap.get(memberId) : undefined;

      if (!ownerId) {
        throw new Error(`Missing owner mapping for ESPN team ${team.id}`);
      }

      const record = team.record?.overall;
      const saved = await prisma.team.upsert({
        where: {
          seasonId_espnTeamId: {
            seasonId,
            espnTeamId: team.id,
          },
        },
        create: {
          seasonId,
          ownerId,
          espnTeamId: team.id,
          teamName: teamDisplayName(team),
          wins: record?.wins ?? 0,
          losses: record?.losses ?? 0,
          ties: record?.ties ?? 0,
          pointsFor: record?.pointsFor ?? 0,
          pointsAgainst: record?.pointsAgainst ?? 0,
          playoffSeed: team.rank ?? null,
        },
        update: {
          ownerId,
          teamName: teamDisplayName(team),
          wins: record?.wins ?? 0,
          losses: record?.losses ?? 0,
          ties: record?.ties ?? 0,
          pointsFor: record?.pointsFor ?? 0,
          pointsAgainst: record?.pointsAgainst ?? 0,
          playoffSeed: team.rank ?? null,
        },
      });

      teamMap.set(team.id, saved.id);
    }

    return teamMap;
  }

  private async upsertPlayer(player: EspnPlayer): Promise<string> {
    const saved = await prisma.player.upsert({
      where: { espnPlayerId: player.id },
      create: {
        espnPlayerId: player.id,
        name: player.fullName ?? `Player ${player.id}`,
        position: playerPosition(player),
        nflTeam: playerNflTeam(player),
      },
      update: {
        name: player.fullName ?? `Player ${player.id}`,
        position: playerPosition(player),
        nflTeam: playerNflTeam(player),
      },
    });

    return saved.id;
  }

  private async syncDraft(
    seasonId: string,
    base: EspnLeagueResponse,
    teamMap: Map<number, string>,
  ): Promise<void> {
    const picks = base.draftDetail?.picks ?? [];

    for (const pick of picks) {
      if (
        pick.teamId == null ||
        pick.playerId == null ||
        pick.overallPickNumber == null
      ) {
        continue;
      }

      const teamId = teamMap.get(pick.teamId);
      if (!teamId) {
        continue;
      }

      const playerId = await this.upsertPlayer({
        id: pick.playerId,
        fullName: `Player ${pick.playerId}`,
      });

      await prisma.draftPick.upsert({
        where: {
          seasonId_overallPick: {
            seasonId,
            overallPick: pick.overallPickNumber,
          },
        },
        create: {
          seasonId,
          round: pick.roundId ?? 1,
          overallPick: pick.overallPickNumber,
          teamId,
          playerId,
        },
        update: {
          round: pick.roundId ?? 1,
          teamId,
          playerId,
        },
      });
    }
  }

  private async syncWeeksAndMatchups(
    seasonId: string,
    year: number,
    base: EspnLeagueResponse,
    teamMap: Map<number, string>,
  ): Promise<void> {
    const regularSeasonWeeks =
      base.settings?.scheduleSettings?.matchupPeriodCount ?? 0;
    const finalScoringPeriod =
      base.status?.finalScoringPeriod ??
      base.status?.currentMatchupPeriod ??
      regularSeasonWeeks;

    const totalWeeks = Math.max(finalScoringPeriod, regularSeasonWeeks);

    for (let weekNumber = 1; weekNumber <= totalWeeks; weekNumber += 1) {
      const weekData = await this.client.fetchLeague(year, {
        views: ["mMatchup", "mRoster", "mTeam"],
        scoringPeriodId: weekNumber,
      });

      const isPlayoff = weekNumber > regularSeasonWeeks;
      const week = await prisma.week.upsert({
        where: {
          seasonId_weekNumber: {
            seasonId,
            weekNumber,
          },
        },
        create: {
          seasonId,
          weekNumber,
          isPlayoff,
        },
        update: {
          isPlayoff,
        },
      });

      const schedule = weekData?.schedule ?? [];
      for (const matchup of schedule) {
        if (matchup.matchupPeriodId !== weekNumber) {
          continue;
        }

        const homeTeamId = matchup.home?.teamId
          ? teamMap.get(matchup.home.teamId)
          : undefined;
        const awayTeamId = matchup.away?.teamId
          ? teamMap.get(matchup.away.teamId)
          : undefined;

        if (!homeTeamId || !awayTeamId) {
          continue;
        }

        await prisma.matchup.upsert({
          where: {
            weekId_homeTeamId_awayTeamId: {
              weekId: week.id,
              homeTeamId,
              awayTeamId,
            },
          },
          create: {
            weekId: week.id,
            homeTeamId,
            awayTeamId,
            homeScore: matchup.home?.totalPoints ?? 0,
            awayScore: matchup.away?.totalPoints ?? 0,
            isPlayoff:
              isPlayoff || Boolean(matchup.playoffTierType && matchup.playoffTierType !== "NONE"),
            bracketRound: isPlayoff ? weekNumber - regularSeasonWeeks : null,
          },
          update: {
            homeScore: matchup.home?.totalPoints ?? 0,
            awayScore: matchup.away?.totalPoints ?? 0,
            isPlayoff:
              isPlayoff || Boolean(matchup.playoffTierType && matchup.playoffTierType !== "NONE"),
            bracketRound: isPlayoff ? weekNumber - regularSeasonWeeks : null,
          },
        });
      }

      for (const team of weekData?.teams ?? []) {
        const teamId = teamMap.get(team.id);
        if (!teamId) {
          continue;
        }

        await this.syncRosterEntries(
          seasonId,
          week.id,
          teamId,
          team.roster?.entries ?? [],
          weekNumber,
        );
      }
    }
  }

  private async syncRosterEntries(
    seasonId: string,
    weekId: string,
    teamId: string,
    entries: EspnRosterEntry[],
    weekNumber: number,
  ): Promise<void> {
    for (const entry of entries) {
      const player = entry.playerPoolEntry?.player;
      const espnPlayerId = player?.id ?? entry.playerId;

      if (!espnPlayerId) {
        continue;
      }

      const playerId = await this.upsertPlayer(
        player ?? {
          id: espnPlayerId,
          fullName: `Player ${espnPlayerId}`,
        },
      );

      const lineupSlot = lineupSlotName(entry.lineupSlotId);
      const starter = isStarterSlot(entry.lineupSlotId);

      const weekStatEntry = player?.stats?.find(
        (stat) =>
          stat.scoringPeriodId === weekNumber && stat.statSourceId === 0,
      );
      const seasonStatEntry = player?.stats?.find(
        (stat) => stat.scoringPeriodId === 0 && stat.statSourceId === 0,
      );
      const stats = parseEspnWeekStats(weekStatEntry?.stats);
      const fantasyPoints = weekStatEntry?.appliedTotal ?? 0;

      if (seasonStatEntry?.stats) {
        await upsertPlayerSeasonStatFromEspn(
          seasonId,
          playerId,
          seasonStatEntry.stats,
          seasonStatEntry.appliedTotal,
        );
      }

      await prisma.weeklyRosterSnapshot.upsert({
        where: {
          weekId_teamId_playerId: {
            weekId,
            teamId,
            playerId,
          },
        },
        create: {
          weekId,
          teamId,
          playerId,
          lineupSlot,
          starter,
        },
        update: {
          lineupSlot,
          starter,
        },
      });

      await prisma.weeklyPlayerScore.upsert({
        where: {
          weekId_playerId_teamId: {
            weekId,
            playerId,
            teamId,
          },
        },
        create: {
          weekId,
          playerId,
          teamId,
          fantasyPoints,
          stats,
        },
        update: {
          fantasyPoints,
          stats,
        },
      });
    }
  }

  private async syncTransactions(
    seasonId: string,
    year: number,
    teamMap: Map<number, string>,
  ): Promise<void> {
    const data = await this.client.fetchLeague(year, {
      views: ["mTransactions2"],
    });

    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: { weeks: true },
    });

    if (!season) {
      return;
    }

    const weekByNumber = new Map(
      season.weeks.map((week: { weekNumber: number; id: string }) => [
        week.weekNumber,
        week.id,
      ]),
    );

    for (const transaction of data?.transactions ?? []) {
      if (transaction.status !== "EXECUTED") {
        continue;
      }

      const weekNumber = transaction.scoringPeriodId ?? 1;
      const weekId =
        weekByNumber.get(weekNumber) ??
        weekByNumber.get(1) ??
        season.weeks[0]?.id;

      if (!weekId) {
        continue;
      }

      const espnTeamId = transaction.teamId;
      const teamId = espnTeamId ? teamMap.get(espnTeamId) : undefined;

      if (!teamId) {
        continue;
      }

      const primaryItem = transaction.items?.[0];
      const playerId = primaryItem?.playerId
        ? await this.upsertPlayer({
            id: primaryItem.playerId,
            fullName: `Player ${primaryItem.playerId}`,
          })
        : null;

      const espnTransactionId = transaction.id
        ? String(transaction.id)
        : `${year}-${transaction.type}-${teamId}-${weekNumber}-${playerId ?? "none"}`;

      await prisma.transaction.upsert({
        where: { espnTransactionId },
        create: {
          weekId,
          teamId,
          transactionType: transaction.type ?? "UNKNOWN",
          playerId,
          espnTransactionId,
          details: JSON.stringify(transaction.items ?? []),
        },
        update: {
          weekId,
          teamId,
          transactionType: transaction.type ?? "UNKNOWN",
          playerId,
          details: JSON.stringify(transaction.items ?? []),
        },
      });
    }
  }

  private async syncChampionAndRunnerUp(
    seasonId: string,
    year: number,
  ): Promise<void> {
    await resolveSeasonChampions(seasonId, year);
  }
}

export async function runImport(options: ImportOptions): Promise<ImportSummary> {
  const importer = new SeasonImporter(options);
  return importer.importAll();
}
