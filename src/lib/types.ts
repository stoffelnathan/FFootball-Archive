export type MatchupResult = {
  matchupId: string;
  seasonYear: number;
  weekNumber: number;
  isPlayoff: boolean;
  ownerId: string;
  opponentOwnerId: string;
  teamScore: number;
  opponentScore: number;
  won: boolean;
  tied: boolean;
};

export type OwnerCareerStats = {
  ownerId: string;
  displayName: string;
  championships: number;
  runnerUps: number;
  wins: number;
  losses: number;
  ties: number;
  winPercentage: number;
  pointsFor: number;
  pointsAgainst: number;
  playoffAppearances: number;
  averageFinish: number | null;
  seasonsPlayed: number;
};

export type LeagueRecordEntry = {
  label: string;
  value: string;
  detail?: string;
  href?: string;
};

export type ComputedAward = {
  awardType: string;
  label: string;
  ownerId: string;
  ownerName: string;
  detail?: string;
};

export function formatRecord(wins: number, losses: number, ties = 0): string {
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

export function winPercentage(wins: number, losses: number, ties = 0): number {
  const games = wins + losses + ties;
  if (games === 0) return 0;
  return (wins + ties * 0.5) / games;
}
