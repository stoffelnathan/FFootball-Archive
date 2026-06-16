/** Roster slots for our league (offense only for mock draft). */
export const LEAGUE_ROSTER = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  FLEX: 2,
} as const;

export type SkillPosition = "QB" | "RB" | "WR" | "TE";

export const SKILL_POSITIONS: SkillPosition[] = ["QB", "RB", "WR", "TE"];

export const MOCK_DRAFT = {
  teamCount: 12,
  rounds: 15,
  pickTimerSeconds: 120,
  /** TEs receive 1.5 PPR (0.5 bonus over standard 1.0 PPR). */
  tePremiumPprBonus: 0.5,
  /** Extra FLEX devalues QBs relative to skill positions. */
  qbValueMultiplier: 0.88,
} as const;

export const STARTER_COUNT =
  LEAGUE_ROSTER.QB +
  LEAGUE_ROSTER.RB +
  LEAGUE_ROSTER.WR +
  LEAGUE_ROSTER.TE +
  LEAGUE_ROSTER.FLEX;
