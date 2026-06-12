/**
 * Known champion corrections when ESPN does not expose bracket results.
 * Keys are season years; values are owner display names.
 */
export const CHAMPION_OVERRIDES: Record<
  number,
  { champion: string; runnerUp: string }
> = {
  2024: { champion: "Carter Thompson", runnerUp: "Brandon Hinrichsen" },
  2025: { champion: "Jackson Froderman", runnerUp: "Saaransh Agarwal" },
};
