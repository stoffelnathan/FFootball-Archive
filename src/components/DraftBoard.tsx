"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useContainedWheelScroll } from "@/hooks/use-contained-wheel-scroll";
import { roundForPick } from "@/lib/mock-draft/engine";
import { positionLegend, positionStyle } from "@/lib/position-colors";
import { playerHref } from "@/lib/player-url";
import type { DraftBoardColumn } from "@/lib/services/draft";

const PICK_TILE_W = "var(--draft-pick-tile-w)";
const PICK_TILE_H = "var(--draft-pick-tile-h)";
const ROUND_LABEL_W = "2.75rem";
const MOBILE_TILE_GAP_REM = 0.375;

function scrollNodeIntoContainer(
  container: HTMLElement,
  node: HTMLElement,
  behavior: ScrollBehavior,
) {
  const nodeRect = node.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const targetLeft =
    container.scrollLeft +
    (nodeRect.left - containerRect.left) -
    (containerRect.width - nodeRect.width) / 2;
  const targetTop =
    container.scrollTop +
    (nodeRect.top - containerRect.top) -
    (containerRect.height - nodeRect.height) / 2;

  container.scrollTo({
    left: Math.max(0, targetLeft),
    top: Math.max(0, targetTop),
    behavior,
  });
}

function playerNameClass(name: string, compact?: boolean): string {
  const base = compact ? "leading-tight" : "leading-snug";
  if (name.length > 22) {
    return `${base} line-clamp-2 text-[9px]`;
  }
  if (name.length > 16) {
    return `${base} line-clamp-2 text-[10px]`;
  }
  return `${base} line-clamp-2 ${compact ? "text-[10px]" : "text-[11px]"}`;
}

function DraftPickCell({
  cell,
  compact,
  isOnClock,
  isThinking,
  connected,
}: {
  cell: NonNullable<DraftBoardColumn["cells"][number]>;
  compact?: boolean;
  isOnClock?: boolean;
  isThinking?: boolean;
  connected?: boolean;
}) {
  return (
    <div
      className={`draft-pick-tile flex flex-col justify-between border p-1.5 transition-shadow duration-300 ${connected ? "draft-pick-tile-connected h-full w-full" : "rounded-lg"} ${positionStyle(cell.player.position)} ${
        isOnClock ? "ring-2 ring-emerald-500/80 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]" : ""
      } ${isThinking ? "draft-pick-pulse" : ""}`}
    >
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="truncate text-[9px] font-medium uppercase tracking-wide opacity-80">
          {cell.round}.{String(cell.roundPick).padStart(2, "0")} · #{cell.overallPick}
        </p>
        <Link
          href={playerHref(cell.player.espnPlayerId)}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-0.5 block font-semibold hover:underline ${playerNameClass(cell.player.name, compact)}`}
          title={cell.player.name}
        >
          {cell.player.name}
        </Link>
      </div>
      <p className="truncate text-[9px] leading-tight opacity-80">
        {cell.player.position}
        {cell.player.nflTeam ? ` · ${cell.player.nflTeam}` : ""}
      </p>
    </div>
  );
}

function EmptyPickCell({
  isOnClock,
  isThinking,
  overallPick,
  connected,
}: {
  isOnClock?: boolean;
  isThinking?: boolean;
  overallPick?: number;
  connected?: boolean;
}) {
  return (
    <div
      className={`draft-pick-tile flex flex-col items-center justify-center border border-dashed transition-all duration-300 ${connected ? "draft-pick-tile-connected h-full w-full" : "rounded-lg"} ${
        isOnClock
          ? "border-emerald-600/70 bg-emerald-600/10 ring-2 ring-emerald-500/60"
          : "border-zinc-800 bg-zinc-950/40"
      } ${isThinking ? "draft-pick-pulse" : ""}`}
    >
      {isThinking ? (
        <p className="text-[10px] font-medium text-emerald-300/90">Selecting…</p>
      ) : isOnClock ? (
        <p className="text-[10px] font-medium text-emerald-400">
          {overallPick ? `#${overallPick}` : "On clock"}
        </p>
      ) : null}
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
  onClockTeamSlot,
  onClockOverallPick,
  thinkingTeamSlot,
  roundWindow,
  teamSlotWindow,
  cellRefs,
  pinRoundLabels = true,
}: {
  columns: DraftBoardColumn[];
  rounds: number[];
  variant: "desktop" | "mobile" | "app";
  onClockTeamSlot?: number | null;
  onClockOverallPick?: number | null;
  thinkingTeamSlot?: number | null;
  roundWindow?: { start: number; end: number };
  teamSlotWindow?: { start: number; end: number };
  cellRefs?: React.MutableRefObject<Map<string, HTMLDivElement>>;
  pinRoundLabels?: boolean;
}) {
  const isDesktop = variant === "desktop";
  const isApp = variant === "app";
  const isMobile = variant === "mobile";
  const stickyRoundLabels = isMobile && pinRoundLabels;
  const visibleRounds = roundWindow
    ? rounds.filter((round) => round >= roundWindow.start && round <= roundWindow.end)
    : rounds;

  const visibleColumns = teamSlotWindow
    ? columns.filter((column) => {
        const slot = Number(column.teamId);
        return slot >= teamSlotWindow.start && slot <= teamSlotWindow.end;
      })
    : columns;

  const columnTemplate = isApp
    ? `${ROUND_LABEL_W} repeat(${visibleColumns.length}, minmax(0, 1fr))`
    : `${ROUND_LABEL_W} repeat(${visibleColumns.length}, ${PICK_TILE_W})`;

  const grid = (
    <div
      className={`grid ${isApp ? "draft-pick-grid-app w-full gap-px p-px" : "w-max gap-1.5 p-3"}`}
      style={{
        gridTemplateColumns: columnTemplate,
        gridTemplateRows: `auto repeat(${visibleRounds.length}, ${PICK_TILE_H})`,
      }}
    >
      <div
        className={`flex items-end px-1 pb-2 font-medium uppercase tracking-wide text-zinc-500 ${
          isDesktop
            ? "text-[10px]"
            : stickyRoundLabels
              ? "sticky left-0 top-0 z-30 bg-zinc-950 px-2 text-[11px]"
              : "px-2 text-[11px]"
        }`}
      >
        Rd
      </div>
      {visibleColumns.map((column) => {
        const slot = Number(column.teamId);
        const isClockColumn = onClockTeamSlot === slot;
        return (
          <div
            key={column.teamId}
            data-team-slot={slot}
            className={`flex h-full min-h-0 flex-col justify-end overflow-hidden text-center transition-colors duration-300 ${
              isApp ? "w-full px-0 py-1" : "rounded-md px-1 py-1.5"
            } ${
              isDesktop
                ? isClockColumn
                  ? "bg-emerald-600/15 ring-1 ring-emerald-600/40"
                  : "bg-zinc-900/80"
                : `sticky top-0 z-20 border-b backdrop-blur-sm ${
                    isClockColumn
                      ? "border-emerald-600/50 bg-emerald-600/10"
                      : "border-zinc-800/80 bg-zinc-950/95"
                  }`
            }`}
            style={
              isApp
                ? undefined
                : {
                    width: PICK_TILE_W,
                    minWidth: PICK_TILE_W,
                    maxWidth: PICK_TILE_W,
                  }
            }
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
        );
      })}

      {visibleRounds.map((round) => {
        const roundIndex = rounds.indexOf(round);
        return (
          <div key={round} className="contents">
            <div
              className={`flex items-center px-1 font-medium text-zinc-400 ${
                isDesktop
                  ? "text-xs"
                  : stickyRoundLabels
                    ? "sticky left-0 z-10 bg-zinc-950/95 px-2 text-sm backdrop-blur-sm"
                    : "px-2 text-sm"
              }`}
            >
              {round}
            </div>
            {visibleColumns.map((column) => {
              const cell = column.cells[roundIndex];
              const slot = Number(column.teamId);
              const clockRound =
                onClockOverallPick != null ? roundForPick(onClockOverallPick) : null;
              const isOnClock =
                onClockTeamSlot === slot &&
                cell == null &&
                onClockOverallPick != null &&
                round === clockRound;
              const isThinking =
                thinkingTeamSlot === slot &&
                cell == null &&
                onClockOverallPick != null &&
                round === clockRound;
              const refKey = `${slot}-${round}`;

              return (
                <div
                  key={`${column.teamId}-${round}`}
                  ref={(node) => {
                    if (!cellRefs) return;
                    if (node) cellRefs.current.set(refKey, node);
                    else cellRefs.current.delete(refKey);
                  }}
                  className={isApp ? "draft-pick-cell h-full w-full" : "draft-pick-tile"}
                >
                  {cell ? (
                    <DraftPickCell
                      cell={cell}
                      compact={isDesktop}
                      connected={isApp}
                      isOnClock={false}
                      isThinking={false}
                    />
                  ) : (
                    <EmptyPickCell
                      connected={isApp}
                      isOnClock={isOnClock}
                      isThinking={isThinking}
                      overallPick={isOnClock ? onClockOverallPick ?? undefined : undefined}
                    />
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  if (isApp) {
    return <div className="draft-board-grid-frame">{grid}</div>;
  }

  return grid;
}

export type DraftBoardProps = {
  columns: DraftBoardColumn[];
  rounds: number[];
  scrollable?: boolean;
  mobileRoundWindow?: number;
  mobileVisibleColumns?: number;
  fillAvailable?: boolean;
  pinRoundLabels?: boolean;
  appBoard?: boolean;
  onClockTeamSlot?: number | null;
  onClockOverallPick?: number | null;
  thinkingTeamSlot?: number | null;
  roundWindow?: { start: number; end: number };
  teamSlotWindow?: { start: number; end: number };
  followOnClock?: boolean;
  unifiedScroll?: boolean;
};

export function DraftBoard({
  columns,
  rounds,
  scrollable = false,
  mobileRoundWindow = 2.75,
  mobileVisibleColumns,
  fillAvailable = false,
  pinRoundLabels = true,
  appBoard = false,
  unifiedScroll = false,
  onClockTeamSlot = null,
  onClockOverallPick = null,
  thinkingTeamSlot = null,
  roundWindow,
  teamSlotWindow,
  followOnClock = false,
}: DraftBoardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const userScrolledRef = useRef(false);
  const enableWheelScroll = (appBoard || scrollable) && !unifiedScroll;

  useContainedWheelScroll(scrollRef, enableWheelScroll);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !scrollable) return;

    const markUserScroll = () => {
      if (!followOnClock) userScrolledRef.current = true;
    };

    container.addEventListener("touchstart", markUserScroll, { passive: true });
    container.addEventListener("wheel", markUserScroll, { passive: true });
    return () => {
      container.removeEventListener("touchstart", markUserScroll);
      container.removeEventListener("wheel", markUserScroll);
    };
  }, [scrollable, followOnClock]);

  useEffect(() => {
    if (followOnClock) userScrolledRef.current = false;
  }, [followOnClock]);

  useEffect(() => {
    if (!appBoard || unifiedScroll || !scrollRef.current || onClockTeamSlot == null) return;

    const container = scrollRef.current;
    const wrap = container.querySelector(".draft-board-grid-wrap");
    if (!wrap) return;

    requestAnimationFrame(() => {
      if (wrap.scrollWidth <= container.clientWidth) {
        container.scrollLeft = 0;
        return;
      }

      const column = wrap.querySelector(
        `[data-team-slot="${onClockTeamSlot}"]`,
      ) as HTMLElement | null;
      if (!column) return;

      scrollNodeIntoContainer(container, column, "smooth");
    });
  }, [appBoard, unifiedScroll, columns.length, onClockTeamSlot]);

  useEffect(() => {
    if (!followOnClock || !scrollable) return;

    const focusSlot = thinkingTeamSlot ?? onClockTeamSlot;
    if (focusSlot == null || onClockOverallPick == null) return;
    if (userScrolledRef.current) return;

    const currentRound = roundForPick(onClockOverallPick);
    const key = `${focusSlot}-${currentRound}`;
    const node = cellRefs.current.get(key);
    const container = scrollRef.current;
    if (!node || !container) return;

    requestAnimationFrame(() => {
      scrollNodeIntoContainer(container, node, "smooth");
    });
  }, [
    followOnClock,
    scrollable,
    onClockTeamSlot,
    onClockOverallPick,
    thinkingTeamSlot,
    roundWindow?.start,
    roundWindow?.end,
  ]);

  if (columns.length === 0) {
    return <p className="text-zinc-500">No draft picks found for this season.</p>;
  }

  const gridProps = {
    columns,
    rounds,
    onClockTeamSlot,
    onClockOverallPick,
    thinkingTeamSlot,
    roundWindow,
    teamSlotWindow,
    cellRefs,
    pinRoundLabels,
  };

  if (appBoard && unifiedScroll) {
    return (
      <div className="draft-board-app-unified gap-2 p-2">
        <PositionLegend compact />
        <div className="draft-board-grid-wrap">
          <DraftBoardGrid {...gridProps} variant="app" />
        </div>
      </div>
    );
  }

  if (appBoard) {
    return (
      <div className="draft-board-app flex h-full min-h-0 flex-col gap-2 p-2">
        <PositionLegend compact />
        <div ref={scrollRef} className="draft-board-scroll scrollbar-hidden min-h-0 flex-1 rounded-xl bg-zinc-950/40 p-1">
          <div className="draft-board-scroll-track">
            <div className="draft-board-grid-wrap">
              <DraftBoardGrid {...gridProps} variant="app" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (scrollable) {
    const visibleRoundCount = roundWindow
      ? roundWindow.end - roundWindow.start + 1
      : mobileRoundWindow;
    const viewportHeight = fillAvailable
      ? undefined
      : `calc(3.25rem + 3rem + ${visibleRoundCount} * (var(--draft-pick-tile-h) + ${MOBILE_TILE_GAP_REM}rem))`;
    const fullMobileBoard = fillAvailable && mobileVisibleColumns != null;
    const visibleColumnCount = mobileVisibleColumns ?? 4.5;

    return (
      <div className={`flex flex-col gap-2 ${fillAvailable ? "min-h-0 flex-1" : ""}`}>
        <PositionLegend compact />
        <div
          ref={scrollRef}
          className={`scrollbar-hidden w-full max-w-full overflow-auto overscroll-contain rounded-lg border border-zinc-800/80 bg-zinc-950/60 [-webkit-overflow-scrolling:touch] ${
            fillAvailable ? "min-h-0 flex-1" : ""
          } ${followOnClock ? "draft-board-follow-scroll" : ""} ${
            fullMobileBoard ? "draft-board-full-mobile" : ""
          }`}
          style={{
            maxHeight: viewportHeight,
            ...(fullMobileBoard
              ? ({
                  "--draft-board-visible-cols": visibleColumnCount,
                } as React.CSSProperties)
              : undefined),
          }}
        >
          <DraftBoardGrid {...gridProps} variant="mobile" />
        </div>
        <p className="text-center text-[11px] text-zinc-500">
          {followOnClock
            ? "Following live picks · swipe sideways anytime on your turn"
            : roundWindow
              ? "Swipe sideways to browse teams · 3 rounds shown"
              : "Scroll for all rounds · swipe sideways for teams"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 lg:gap-2">
      <PositionLegend compact />

      <div className="hidden min-h-0 flex-1 lg:flex">
        <div className="flex min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <DraftBoardGrid {...gridProps} variant="desktop" />
        </div>
      </div>

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
          ref={scrollRef}
          className="overflow-auto overscroll-contain rounded-none border-y border-zinc-800 bg-zinc-950/60 [-webkit-overflow-scrolling:touch] [max-height:calc(100dvh-11.5rem)]"
        >
          <DraftBoardGrid {...gridProps} variant="mobile" />
        </div>
      </div>
    </div>
  );
}
