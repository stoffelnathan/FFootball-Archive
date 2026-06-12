export interface EspnLeagueResponse {
  id: number;
  settings?: {
    name?: string;
    scheduleSettings?: {
      matchupPeriodCount?: number;
      playoffTeamCount?: number;
      playoffMatchupPeriodLength?: number;
    };
  };
  status?: {
    currentMatchupPeriod?: number;
    finalScoringPeriod?: number;
  };
  members?: EspnMember[];
  teams?: EspnTeam[];
  schedule?: EspnScheduleMatchup[];
  draftDetail?: {
    picks?: EspnDraftPick[];
  };
  transactions?: EspnTransaction[];
}

export interface EspnMember {
  id: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
}

export interface EspnTeam {
  id: number;
  location?: string;
  nickname?: string;
  abbrev?: string;
  owners?: string[];
  record?: {
    overall?: {
      wins?: number;
      losses?: number;
      ties?: number;
      pointsFor?: number;
      pointsAgainst?: number;
    };
  };
  rank?: number;
  playoffSeed?: number;
  rankCalculatedFinal?: number;
  finalStandingsPosition?: number;
  roster?: {
    entries?: EspnRosterEntry[];
  };
}

export interface EspnRosterEntry {
  playerId?: number;
  lineupSlotId?: number;
  appliedStatTotal?: number;
  playerPoolEntry?: {
    appliedStatTotal?: number;
    player?: EspnPlayer;
  };
}

export interface EspnPlayer {
  id: number;
  fullName?: string;
  defaultPositionId?: number;
  proTeamId?: number;
  stats?: EspnPlayerStatEntry[];
}

export interface EspnPlayerStatEntry {
  scoringPeriodId?: number;
  statSourceId?: number;
  stats?: Record<string, number>;
  appliedTotal?: number;
  proTeamId?: number;
  externalId?: string;
}

export interface EspnScheduleMatchup {
  id?: number;
  matchupPeriodId?: number;
  playoffTierType?: string;
  home?: EspnMatchupSide;
  away?: EspnMatchupSide;
}

export interface EspnMatchupSide {
  teamId?: number;
  totalPoints?: number;
}

export interface EspnDraftPick {
  roundId?: number;
  roundPickNumber?: number;
  overallPickNumber?: number;
  teamId?: number;
  playerId?: number;
}

export interface EspnTransaction {
  id?: string;
  type?: string;
  status?: string;
  scoringPeriodId?: number;
  teamId?: number;
  memberId?: string;
  items?: Array<{
    playerId?: number;
    type?: string;
    fromTeamId?: number;
    toTeamId?: number;
  }>;
}

export interface EspnClientConfig {
  leagueId: number;
  espnS2?: string;
  swid?: string;
}
