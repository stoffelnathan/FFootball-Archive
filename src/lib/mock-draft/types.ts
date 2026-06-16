import type { SkillPosition } from "@/lib/league-settings";

export type MockDraftPlayer = {
  id: string;
  espnPlayerId: number;
  name: string;
  position: SkillPosition;
  nflTeam: string | null;
  /** League-scored fantasy points (prior season). */
  leaguePoints: number;
  /** Value over replacement for our roster construction. */
  draftValue: number;
  /** Overall rank in the mock draft board. */
  rank: number;
  posRankLabel: string;
};

export type MockDraftTeam = {
  slot: number;
  name: string;
  isUser: boolean;
};

export type MockDraftPick = {
  overallPick: number;
  round: number;
  roundPick: number;
  teamSlot: number;
  player: MockDraftPlayer;
};

export type MockDraftRoster = {
  QB: MockDraftPlayer[];
  RB: MockDraftPlayer[];
  WR: MockDraftPlayer[];
  TE: MockDraftPlayer[];
};

export type MockDraftPhase = "slot-select" | "timer-select" | "drafting" | "recap";

export type MockDraftState = {
  phase: MockDraftPhase;
  userSlot: number | null;
  teams: MockDraftTeam[];
  picks: MockDraftPick[];
  currentOverallPick: number;
  timerSeconds: number;
};
