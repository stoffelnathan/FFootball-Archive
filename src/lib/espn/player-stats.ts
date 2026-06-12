/**
 * Canonical ESPN stat IDs mapped to stable keys for storage/display.
 * Based on espn-api PLAYER_STATS_MAP — excludes derivative "every N yards" IDs.
 */
export const ESPN_STAT_KEYS: Record<number, string> = {
  0: "passAttempts",
  1: "passCompletions",
  3: "passYards",
  4: "passTouchdowns",
  19: "passTwoPtConversions",
  20: "interceptions",
  21: "completionPct",
  23: "rushAttempts",
  24: "rushYards",
  25: "rushTouchdowns",
  26: "rushTwoPtConversions",
  41: "receptions",
  42: "recYards",
  43: "recTouchdowns",
  44: "recTwoPtConversions",
  58: "targets",
  59: "yardsAfterCatch",
  60: "yardsPerReception",
  72: "fumblesLost",
  83: "fgMade",
  84: "fgAttempted",
  86: "xpMade",
  87: "xpAttempted",
  95: "defInterceptions",
  96: "defFumbleRecoveries",
  97: "blockedKicks",
  98: "safeties",
  99: "sacks",
  107: "defForcedFumbles",
  108: "defSoloTackles",
  109: "defTotalTackles",
  113: "passesDefended",
  120: "pointsAllowed",
};

export const STAT_LABELS: Record<string, string> = {
  fantasyPoints: "Fantasy Pts",
  games: "Games",
  passAttempts: "Pass Att",
  passCompletions: "Completions",
  completionPct: "Comp %",
  passYards: "Pass Yds",
  passTouchdowns: "Pass TD",
  interceptions: "INT",
  passTwoPtConversions: "Pass 2PT",
  rushAttempts: "Rush Att",
  rushYards: "Rush Yds",
  rushTouchdowns: "Rush TD",
  rushTwoPtConversions: "Rush 2PT",
  targets: "Targets",
  receptions: "Receptions",
  catchPct: "Catch %",
  targetShare: "Team Target Share",
  recYards: "Rec Yds",
  recTouchdowns: "Rec TD",
  recTwoPtConversions: "Rec 2PT",
  yardsAfterCatch: "YAC",
  yardsPerReception: "Y/R",
  yardsPerTarget: "Y/T",
  fumblesLost: "Fumbles Lost",
  fgMade: "FG Made",
  fgAttempted: "FG Att",
  fgPct: "FG %",
  xpMade: "XP Made",
  xpAttempted: "XP Att",
  defInterceptions: "DEF INT",
  defFumbleRecoveries: "Fumble Rec",
  blockedKicks: "Blocked Kicks",
  safeties: "Safeties",
  sacks: "Sacks",
  defForcedFumbles: "Forced Fumbles",
  defSoloTackles: "Solo Tackles",
  defTotalTackles: "Total Tackles",
  passesDefended: "Passes Defended",
  pointsAllowed: "Pts Allowed",
};

export const POSITION_STAT_ORDER: Record<string, string[]> = {
  QB: [
    "fantasyPoints",
    "games",
    "passAttempts",
    "passCompletions",
    "completionPct",
    "passYards",
    "passTouchdowns",
    "interceptions",
    "rushAttempts",
    "rushYards",
    "rushTouchdowns",
    "fumblesLost",
  ],
  RB: [
    "fantasyPoints",
    "games",
    "rushAttempts",
    "rushYards",
    "rushTouchdowns",
    "targets",
    "receptions",
    "catchPct",
    "targetShare",
    "recYards",
    "recTouchdowns",
    "yardsAfterCatch",
    "fumblesLost",
  ],
  WR: [
    "fantasyPoints",
    "games",
    "targets",
    "receptions",
    "catchPct",
    "targetShare",
    "recYards",
    "recTouchdowns",
    "yardsAfterCatch",
    "yardsPerReception",
    "yardsPerTarget",
    "fumblesLost",
  ],
  TE: [
    "fantasyPoints",
    "games",
    "targets",
    "receptions",
    "catchPct",
    "targetShare",
    "recYards",
    "recTouchdowns",
    "yardsAfterCatch",
    "yardsPerReception",
    "yardsPerTarget",
    "fumblesLost",
  ],
  K: [
    "fantasyPoints",
    "games",
    "fgMade",
    "fgAttempted",
    "fgPct",
    "xpMade",
    "xpAttempted",
  ],
  "D/ST": [
    "fantasyPoints",
    "games",
    "sacks",
    "defInterceptions",
    "defFumbleRecoveries",
    "defForcedFumbles",
    "defTotalTackles",
    "passesDefended",
    "blockedKicks",
    "safeties",
    "pointsAllowed",
  ],
  FLEX: [
    "fantasyPoints",
    "games",
    "rushAttempts",
    "rushYards",
    "rushTouchdowns",
    "targets",
    "receptions",
    "recYards",
    "recTouchdowns",
  ],
  DEFAULT: [
    "fantasyPoints",
    "games",
    "passYards",
    "rushYards",
    "recYards",
    "targets",
    "receptions",
  ],
};

export type PlayerStatMap = Record<string, number>;

export function parseEspnWeekStats(
  rawStats: Record<string, number> | undefined,
): PlayerStatMap {
  const parsed: PlayerStatMap = {};
  if (!rawStats) return parsed;

  for (const [id, value] of Object.entries(rawStats)) {
    const key = ESPN_STAT_KEYS[Number(id)];
    if (!key) continue;
    parsed[key] = (parsed[key] ?? 0) + value;
  }
  return parsed;
}

export function mergeStatMaps(...maps: PlayerStatMap[]): PlayerStatMap {
  const merged: PlayerStatMap = {};
  for (const map of maps) {
    for (const [key, value] of Object.entries(map)) {
      merged[key] = (merged[key] ?? 0) + value;
    }
  }
  return merged;
}

export function finalizeSeasonStats(
  totals: PlayerStatMap,
  teamTargets: number,
): PlayerStatMap {
  const result = { ...totals };

  if (result.passAttempts && result.passCompletions != null) {
    result.completionPct =
      result.passAttempts > 0
        ? (result.passCompletions / result.passAttempts) * 100
        : 0;
  }

  if (result.targets && result.receptions != null) {
    result.catchPct =
      result.targets > 0 ? (result.receptions / result.targets) * 100 : 0;
  }

  if (result.targets && teamTargets > 0) {
    result.targetShare = (result.targets / teamTargets) * 100;
  }

  if (result.recYards && result.receptions) {
    result.yardsPerReception =
      result.receptions > 0 ? result.recYards / result.receptions : 0;
  }

  if (result.recYards && result.targets) {
    result.yardsPerTarget =
      result.targets > 0 ? result.recYards / result.targets : 0;
  }

  if (result.fgMade != null && result.fgAttempted) {
    result.fgPct =
      result.fgAttempted > 0 ? (result.fgMade / result.fgAttempted) * 100 : 0;
  }

  return result;
}

export function statOrderForPosition(position: string): string[] {
  return POSITION_STAT_ORDER[position] ?? POSITION_STAT_ORDER.DEFAULT;
}

export function formatStatValue(key: string, value: number): string {
  if (key === "games") return String(Math.round(value));
  if (
    key === "completionPct" ||
    key === "catchPct" ||
    key === "targetShare" ||
    key === "fgPct"
  ) {
    return `${value.toFixed(1)}%`;
  }
  if (
    key === "yardsPerReception" ||
    key === "yardsPerTarget" ||
    key === "fantasyPoints"
  ) {
    return value.toFixed(2);
  }
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}
