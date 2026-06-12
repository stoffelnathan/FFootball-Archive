const POSITION_STYLES: Record<string, string> = {
  QB: "border-red-700/70 bg-red-950/50 text-red-100",
  RB: "border-emerald-700/70 bg-emerald-950/50 text-emerald-100",
  WR: "border-sky-700/70 bg-sky-950/50 text-sky-100",
  TE: "border-orange-700/70 bg-orange-950/50 text-orange-100",
  K: "border-purple-700/70 bg-purple-950/50 text-purple-100",
  "D/ST": "border-yellow-700/70 bg-yellow-950/50 text-yellow-100",
};

const DEFAULT_STYLE =
  "border-zinc-700/70 bg-zinc-900/70 text-zinc-100";

export function positionStyle(position: string): string {
  return POSITION_STYLES[position] ?? DEFAULT_STYLE;
}

export function positionLegend() {
  return Object.entries(POSITION_STYLES).map(([position, style]) => ({
    position,
    style,
  }));
}
