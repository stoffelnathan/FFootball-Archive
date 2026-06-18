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
  /** Default pick timer; overridden by user selection. */
  defaultPickTimerSeconds: 120,
  /** TEs receive 1.5 PPR (0.5 bonus over standard 1.0 PPR). */
  tePremiumPprBonus: 0.5,
  /** Extra FLEX devalues QBs relative to skill positions. */
  qbValueMultiplier: 0.88,
  /** Pause between CPU selections (ms). */
  cpuPickDelayMs: 1000,
} as const;

/** null = unlimited time per pick */
export const PICK_TIMER_OPTIONS: Array<{ label: string; value: number | null }> =
  [
    { label: "30 seconds", value: 30 },
    { label: "1 minute", value: 60 },
    { label: "1:30", value: 90 },
    { label: "2 minutes", value: 120 },
    { label: "2:30", value: 150 },
    { label: "3 minutes", value: 180 },
    { label: "3:30", value: 210 },
    { label: "4 minutes", value: 240 },
    { label: "4:30", value: 270 },
    { label: "5 minutes", value: 300 },
    { label: "Unlimited", value: null },
  ];

export const STARTER_COUNT =
  LEAGUE_ROSTER.QB +
  LEAGUE_ROSTER.RB +
  LEAGUE_ROSTER.WR +
  LEAGUE_ROSTER.TE +
  LEAGUE_ROSTER.FLEX;
