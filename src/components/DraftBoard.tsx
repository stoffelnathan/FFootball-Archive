import Link from "next/link";
import { positionLegend, positionStyle } from "@/lib/position-colors";
import { playerHref } from "@/lib/player-url";
import type { DraftBoardColumn } from "@/lib/services/draft";

function DraftPickCell({
  cell,
  compact,
}: {
  cell: NonNullable<DraftBoardColumn["cells"][number]>;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex h-full min-h-0 flex-col justify-between rounded-lg border ${compact ? "p-1.5" : "p-2"} ${positionStyle(cell.player.position)}`}
    >
      <div className="min-w-0">
        <p
          className={`font-medium uppercase tracking-wide opacity-80 ${compact ? "text-[9px]" : "text-[10px]"}`}
        >
          {cell.round}.{String(cell.roundPick).padStart(2, "0")} · #{cell.overallPick}
        </p>
        <Link
          href={playerHref(cell.player.espnPlayerId)}
          className={`mt-0.5 block truncate font-semibold leading-snug hover:underline ${compact ? "text-[11px]" : "text-xs"}`}
        >
          {cell.player.name}
        </Link>
      </div>
      <p
        className={`truncate leading-tight opacity-80 ${compact ? "text-[9px]" : "text-[10px]"}`}
      >
        {cell.player.position}
        {cell.player.nflTeam ? ` · ${cell.player.nflTeam}` : ""}
      </p>
    </div>
  );
}

function PositionLegend({ compact }: { compact?: boolean }) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? "gap-1" : ""}`}>
      {positionLegend().map(({ position, style }) => (
        <span
          key={position}
          className={`rounded-full border ${compact ? "px-1.5 py-px text-[9px]" : "px-2 py-0.5 text-[10px]"} ${style}`}
        >
          {position}
        </span>
      ))}
    </div>
  );
}

function DraftBoardGrid({
  columns,
  rounds,
  variant,
}: {
  columns: DraftBoardColumn[];
  rounds: number[];
  variant: "desktop" | "mobile";
}) {
  const isDesktop = variant === "desktop";
  const columnTemplate = isDesktop
    ? `2.25rem repeat(${columns.length}, minmax(0, 1fr))`
    : `2.75rem repeat(${columns.length}, minmax(5.25rem, 1fr))`;

  return (
    <div
      className={`grid w-full gap-1 ${isDesktop ? "h-full min-h-0 p-2" : "min-w-max gap-1.5 p-3"}`}
      style={{
        gridTemplateColumns: columnTemplate,
        ...(isDesktop
          ? { gridTemplateRows: `auto repeat(${rounds.length}, minmax(0, 1fr))` }
          : {}),
      }}
    >
      <div
        className={`flex items-end px-1 pb-2 font-medium uppercase tracking-wide text-zinc-500 ${
          isDesktop
            ? "text-[10px]"
            : "sticky left-0 top-0 z-30 bg-zinc-950 px-2 text-[11px]"
        }`}
      >
        Rd
      </div>
      {columns.map((column) => (
        <div
          key={column.teamId}
          className={`rounded-md bg-zinc-900/80 px-1 py-2 text-center ${
            isDesktop
              ? ""
              : "sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-sm"
          }`}
        >
          <p
            className={`truncate font-semibold text-zinc-100 ${isDesktop ? "text-[11px]" : "text-xs"}`}
          >
            {column.ownerName}
          </p>
          <p
            className={`truncate text-zinc-500 ${isDesktop ? "text-[10px]" : "text-[11px]"}`}
          >
            {column.teamName}
          </p>
        </div>
      ))}

      {rounds.map((round, roundIndex) => (
        <div key={round} className="contents">
          <div
            className={`flex items-center px-1 font-medium text-zinc-400 ${
              isDesktop
                ? "text-xs"
                : "sticky left-0 z-10 bg-zinc-950/95 px-2 text-sm backdrop-blur-sm"
            }`}
          >
            {round}
          </div>
          {columns.map((column) => {
            const cell = column.cells[roundIndex];
            return (
              <div
                key={`${column.teamId}-${round}`}
                className={isDesktop ? "min-h-0" : "min-h-[5.25rem]"}
              >
                {cell ? (
                  <DraftPickCell cell={cell} compact={isDesktop} />
                ) : (
                  <div
                    className={`h-full rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40 ${
                      isDesktop ? "min-h-0" : "min-h-[5.25rem]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function DraftBoard({
  columns,
  rounds,
}: {
  columns: DraftBoardColumn[];
  rounds: number[];
}) {
  if (columns.length === 0) {
    return <p className="text-zinc-500">No draft picks found for this season.</p>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 lg:gap-2">
      <PositionLegend compact />

      {/* Desktop: fit the full board within a normal viewport */}
      <div className="hidden min-h-0 flex-1 lg:flex">
        <div className="flex min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <DraftBoardGrid columns={columns} rounds={rounds} variant="desktop" />
        </div>
      </div>

      {/* Mobile: immersive panning board — scroll in both directions */}
      <div className="relative -mx-4 lg:hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-zinc-950 via-zinc-950/80 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-zinc-950 to-transparent"
        />

        <div className="overflow-auto overscroll-contain rounded-none border-y border-zinc-800 bg-zinc-950/60 [-webkit-overflow-scrolling:touch] [max-height:calc(100dvh-11.5rem)]">
          <DraftBoardGrid columns={columns} rounds={rounds} variant="mobile" />
        </div>

        <p className="mt-2 text-center text-[11px] text-zinc-500">
          Swipe to explore the full board
        </p>
      </div>
    </div>
  );
}
