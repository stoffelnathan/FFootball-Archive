"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useContainedWheelScroll } from "@/hooks/use-contained-wheel-scroll";
import { useIsMobile } from "@/hooks/use-media-query";
import { useUnifiedDraftScroll } from "@/hooks/use-unified-draft-scroll";
import { DraftBoard } from "@/components/DraftBoard";
import { positionStyle } from "@/lib/position-colors";
import { playerHref } from "@/lib/player-url";
import {
  MOCK_DRAFT,
  PICK_TIMER_OPTIONS,
  STARTER_COUNT,
} from "@/lib/league-settings";
import {
  availablePlayers,
  buildTeams,
  cpuSelectPlayer,
  draftOrderRosterLayout,
  isDraftComplete,
  optimalLineupPoints,
  rosterFromPicks,
  roundForPick,
  roundPickNumber,
  teamSlotForPick,
  totalPicks,
} from "@/lib/mock-draft/engine";
import type {
  MockDraftPick,
  MockDraftPlayer,
  MockDraftPhase,
} from "@/lib/mock-draft/types";
import type { DraftBoardColumn } from "@/lib/services/draft";

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function buildBoardColumns(
  teams: ReturnType<typeof buildTeams>,
  picks: MockDraftPick[],
): { columns: DraftBoardColumn[]; rounds: number[] } {
  const rounds = Array.from({ length: MOCK_DRAFT.rounds }, (_, index) => index + 1);
  const columns: DraftBoardColumn[] = teams.map((team) => ({
    teamId: String(team.slot),
    ownerName: team.isUser ? `You (#${team.slot})` : team.name,
    teamName: team.isUser ? "Your Team" : `Team ${team.slot}`,
    cells: rounds.map((round) => {
      const pick = picks.find(
        (entry) => entry.teamSlot === team.slot && entry.round === round,
      );
      if (!pick) return null;
      return {
        id: `${team.slot}-${round}`,
        round: pick.round,
        overallPick: pick.overallPick,
        roundPick: pick.roundPick,
        player: {
          id: pick.player.id,
          name: pick.player.name,
          position: pick.player.position,
          nflTeam: pick.player.nflTeam,
          espnPlayerId: pick.player.espnPlayerId,
        },
        ownerName: team.name,
      };
    }),
  }));

  return { columns, rounds };
}

function MobileDraftSetup() {
  const formRef = useRef<HTMLFormElement>(null);

  const submitSlotForm = (select: HTMLSelectElement) => {
    if (!select.value) return;
    const form = select.form ?? formRef.current;
    if (!form) return;
    if (typeof form.requestSubmit === "function") {
      form.requestSubmit();
    } else {
      form.submit();
    }
  };

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const select = form.elements.namedItem("slot");
    if (!(select instanceof HTMLSelectElement)) return;

    const handleChange = () => submitSlotForm(select);

    select.addEventListener("change", handleChange);
    select.addEventListener("input", handleChange);
    return () => {
      select.removeEventListener("change", handleChange);
      select.removeEventListener("input", handleChange);
    };
  }, []);

  return (
    <div className="draft-mobile-setup mx-auto w-full max-w-md px-1 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Mock Draft
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            12-team snake · {MOCK_DRAFT.rounds} rounds · TE premium · unlimited
            time per pick
          </p>
        </div>
        <Link
          href="/draft"
          className="shrink-0 pt-1 text-xs text-zinc-500 transition hover:text-emerald-300"
        >
          Archive
        </Link>
      </div>

      <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <label
          htmlFor="mobile-draft-slot"
          className="block text-sm font-medium text-zinc-200"
        >
          Choose your draft slot
        </label>
        <p className="mt-1 text-xs text-zinc-500">
          Pick a slot to load the draft room.
        </p>
        <form ref={formRef} method="get" action="/draft/mock" className="mt-4">
          <select
            id="mobile-draft-slot"
            name="slot"
            required
            defaultValue=""
            onChange={(event) => submitSlotForm(event.currentTarget)}
            className="w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-4 text-base text-zinc-100"
          >
            <option value="" disabled>
              Select slot…
            </option>
            {Array.from({ length: MOCK_DRAFT.teamCount }, (_, index) => index + 1).map(
              (draftSlot) => (
                <option key={draftSlot} value={draftSlot}>
                  Slot {draftSlot}
                </option>
              ),
            )}
          </select>
        </form>
      </section>
    </div>
  );
}

function SlotPickerButton({
  slot,
  onSelect,
}: {
  slot: number;
  onSelect: (slot: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(slot)}
      className="slot-picker-button min-h-[4.25rem] rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-4 text-center transition active:scale-[0.98] active:border-emerald-600 active:bg-emerald-600/10 hover:border-emerald-600 hover:bg-emerald-600/10 sm:min-h-[4.75rem] sm:px-4 sm:py-5"
    >
      <span className="pointer-events-none block text-2xl font-semibold text-zinc-100">
        {slot}
      </span>
      <span className="pointer-events-none mt-1 block text-[11px] uppercase tracking-wide text-zinc-500">
        Pick
      </span>
    </button>
  );
}

function SlotPicker({ onSelect }: { onSelect: (slot: number) => void }) {
  return (
    <div className="slot-picker-surface relative z-10 mx-auto max-w-3xl">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-6">
        <h2 className="text-xl font-semibold text-zinc-100">Choose your draft slot</h2>
        <p className="mt-2 text-sm text-zinc-400">
          12-team snake draft · {MOCK_DRAFT.rounds} rounds · 1 QB / 2 RB / 2 WR /
          2 FLEX / 1 TE · TE premium (1.5 PPR)
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {Array.from({ length: MOCK_DRAFT.teamCount }, (_, index) => {
            const slot = index + 1;
            return (
              <SlotPickerButton key={slot} slot={slot} onSelect={onSelect} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TimerSetup({
  slot,
  onBack,
  onStart,
}: {
  slot: number;
  onBack: () => void;
  onStart: (seconds: number | null) => void;
}) {
  const [selected, setSelected] = useState<number | null>(
    MOCK_DRAFT.defaultPickTimerSeconds,
  );

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Draft slot</p>
        <h2 className="mt-1 text-2xl font-semibold text-zinc-100">#{slot}</h2>
        <label
          htmlFor="pick-timer"
          className="mt-6 block text-sm font-medium text-zinc-300"
        >
          Time per pick
        </label>
        <select
          id="pick-timer"
          value={selected ?? "unlimited"}
          onChange={(event) => {
            const value = event.target.value;
            setSelected(value === "unlimited" ? null : Number(value));
          }}
          className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"
        >
          {PICK_TIMER_OPTIONS.map((option) => (
            <option
              key={option.label}
              value={option.value ?? "unlimited"}
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onStart(selected)}
            className="rounded-lg border border-emerald-600 bg-emerald-600/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-600/20"
          >
            Start draft
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-600"
          >
            Change slot
          </button>
        </div>
      </div>
    </div>
  );
}

type SidePanelTab = "available" | "team";

function teamLabel(team: { slot: number; name: string; isUser: boolean }): string {
  return team.isUser ? `You (#${team.slot})` : `${team.name} (#${team.slot})`;
}

function RosterSlotRow({
  label,
  player,
  pick,
}: {
  label: string;
  player: MockDraftPlayer | null;
  pick: MockDraftPick | null;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${
        player ? "border-zinc-800 bg-zinc-900/40" : "border-dashed border-zinc-800/80"
      }`}
    >
      <span className="w-10 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      {player && pick ? (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-100">
            <Link
              href={playerHref(player.espnPlayerId)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-300 hover:underline"
            >
              {player.name}
            </Link>
          </p>
          <p className="truncate text-[11px] text-zinc-500">
            R{pick.round} · #{pick.overallPick}
            {player.nflTeam ? ` · ${player.nflTeam}` : ""}
          </p>
        </div>
      ) : (
        <p className="text-sm text-zinc-600">Empty</p>
      )}
      {player ? (
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${positionStyle(player.position)}`}
        >
          {player.position}
        </span>
      ) : null}
    </div>
  );
}

function DraftSidePanel({
  teams,
  picks,
  availablePlayers,
  panelTab,
  onPanelTabChange,
  viewTeamSlot,
  onViewTeamSlotChange,
  onDraft,
  canDraft,
  onClose,
  wheelCaptureRef,
  embeddedInDrawer = false,
  unifiedScroll = false,
}: {
  teams: ReturnType<typeof buildTeams>;
  picks: MockDraftPick[];
  availablePlayers: MockDraftPlayer[];
  panelTab: SidePanelTab;
  onPanelTabChange: (tab: SidePanelTab) => void;
  viewTeamSlot: number;
  onViewTeamSlotChange: (slot: number) => void;
  onDraft: (player: MockDraftPlayer) => void;
  canDraft: boolean;
  onClose?: () => void;
  wheelCaptureRef?: RefObject<HTMLElement | null>;
  embeddedInDrawer?: boolean;
  unifiedScroll?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<string>("ALL");
  const panelScrollRef = useRef<HTMLDivElement>(null);

  useContainedWheelScroll(panelScrollRef, !unifiedScroll, wheelCaptureRef);

  const handlePanelWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      const el = event.currentTarget;
      const maxTop = el.scrollHeight - el.clientHeight;
      if (maxTop <= 0) return;

      el.scrollTop = Math.max(
        0,
        Math.min(maxTop, el.scrollTop + event.deltaY),
      );
      event.preventDefault();
      event.stopPropagation();
    },
    [],
  );

  const filteredAvailable = useMemo(() => {
    return availablePlayers.filter((player) => {
      if (position !== "ALL" && player.position !== position) return false;
      if (!query.trim()) return true;
      return player.name.toLowerCase().includes(query.trim().toLowerCase());
    });
  }, [availablePlayers, position, query]);

  const rosterLayout = useMemo(
    () => draftOrderRosterLayout(viewTeamSlot, picks),
    [viewTeamSlot, picks],
  );

  const selectedTeam = teams.find((team) => team.slot === viewTeamSlot);
  const teamPickCount = picks.filter((pick) => pick.teamSlot === viewTeamSlot).length;

  return (
    <div
      className={
        unifiedScroll
          ? "draft-side-panel-unified bg-zinc-950"
          : "draft-side-panel bg-zinc-950"
      }
    >
      <div
        className={`draft-side-panel-chrome border-b border-zinc-800 px-3 md:px-4 ${
          embeddedInDrawer ? "space-y-1.5 py-1.5" : "space-y-2 py-2"
        }`}
      >
        {!embeddedInDrawer ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-zinc-100 md:text-base">
                {panelTab === "available" ? "Available players" : "Team roster"}
              </h3>
              <p className="text-[11px] text-zinc-500 md:text-xs">
                {panelTab === "available"
                  ? canDraft
                    ? "Tap a player to draft"
                    : "Wait for your pick"
                  : selectedTeam
                    ? `${teamPickCount} pick${teamPickCount === 1 ? "" : "s"} · ${teamLabel(selectedTeam)}`
                    : "Drafted players"}
              </p>
            </div>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
              >
                Close
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
          <button
            type="button"
            onClick={() => onPanelTabChange("available")}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              panelTab === "available"
                ? "bg-zinc-800 text-emerald-300"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Available
          </button>
          <button
            type="button"
            onClick={() => onPanelTabChange("team")}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              panelTab === "team"
                ? "bg-zinc-800 text-emerald-300"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Team
          </button>
        </div>
        {panelTab === "team" ? (
          <>
            <label className="sr-only" htmlFor="side-panel-team">
              Team
            </label>
            <select
              id="side-panel-team"
              value={viewTeamSlot}
              onChange={(event) => onViewTeamSlotChange(Number(event.target.value))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            >
              {teams.map((team) => (
                <option key={team.slot} value={team.slot}>
                  {teamLabel(team)}
                </option>
              ))}
            </select>
          </>
        ) : null}
        {panelTab === "available" ? (
          <div className={embeddedInDrawer ? "space-y-1.5" : "space-y-2"}>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search players…"
              className={`w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-500 ${
                embeddedInDrawer ? "py-1.5" : "py-1.5 md:py-2"
              }`}
            />
            <div className="flex flex-wrap gap-1">
              {["ALL", "QB", "RB", "WR", "TE"].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPosition(option)}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
                    position === option
                      ? "border-emerald-600 bg-emerald-600/10 text-emerald-300"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div
        ref={unifiedScroll ? undefined : panelScrollRef}
        onWheel={unifiedScroll ? undefined : handlePanelWheel}
        className={
          unifiedScroll
            ? "draft-side-panel-body px-3 py-2 md:px-4 md:py-2"
            : "draft-side-panel-scroll scrollbar-hidden min-h-0 px-3 py-2 md:px-4 md:py-2"
        }
      >
        {panelTab === "available" ? (
          <ul className="flex flex-col gap-1.5">
            {filteredAvailable.map((player) => (
              <li key={player.id}>
                <button
                  type="button"
                  disabled={!canDraft}
                  onClick={() => onDraft(player)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition ${
                    canDraft
                      ? "border-zinc-800 hover:border-emerald-700/60 hover:bg-zinc-900/80"
                      : "cursor-not-allowed border-zinc-900 opacity-60"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-100">
                      #{player.rank} {player.name}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {player.posRankLabel}
                      {player.nflTeam ? ` · ${player.nflTeam}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${positionStyle(player.position)}`}
                  >
                    {player.position}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Starters
              </p>
              <ul className="flex flex-col gap-1.5">
                {rosterLayout.starters.map((slot, index) => (
                  <li key={`${slot.label}-${index}`}>
                    <RosterSlotRow
                      label={slot.label}
                      player={slot.player}
                      pick={slot.pick}
                    />
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Bench
              </p>
              {rosterLayout.bench.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-800/80 px-3 py-4 text-center text-sm text-zinc-600">
                  No bench players yet
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {rosterLayout.bench.map((slot, index) => (
                    <li key={slot.pick?.overallPick ?? index}>
                      <RosterSlotRow
                        label={slot.label}
                        player={slot.player}
                        pick={slot.pick}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DraftRecap({
  userSlot,
  picks,
  seasonYear,
  onRestart,
}: {
  userSlot: number;
  picks: MockDraftPick[];
  seasonYear: number;
  onRestart: () => void;
}) {
  const roster = rosterFromPicks(userSlot, picks);
  const lineupPoints = optimalLineupPoints(roster);
  const userPicks = picks
    .filter((pick) => pick.teamSlot === userSlot)
    .sort((a, b) => a.overallPick - b.overallPick);

  const bestPick = userPicks.reduce<MockDraftPick | null>((best, pick) => {
    if (!best || pick.player.rank < best.player.rank) return pick;
    return best;
  }, null);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Draft slot</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-100">#{userSlot}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Optimal lineup ({seasonYear} pts)
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">
            {lineupPoints.toFixed(1)}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {STARTER_COUNT} starters with 2 FLEX (TE premium scoring)
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Best value pick</p>
          <p className="mt-2 text-lg font-semibold text-zinc-100">
            {bestPick ? (
              <Link
                href={playerHref(bestPick.player.espnPlayerId)}
                className="text-emerald-300 hover:underline"
              >
                {bestPick.player.name}
              </Link>
            ) : (
              "—"
            )}
          </p>
          {bestPick ? (
            <p className="mt-1 text-sm text-zinc-400">
              Round {bestPick.round} · board rank #{bestPick.player.rank}
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="text-lg font-medium text-zinc-100">Your roster</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {(["QB", "RB", "WR", "TE"] as const).map((position) => (
            <div key={position}>
              <p className="text-xs uppercase tracking-wide text-zinc-500">{position}</p>
              <ul className="mt-2 space-y-2">
                {roster[position].length === 0 ? (
                  <li className="text-sm text-zinc-500">—</li>
                ) : (
                  roster[position].map((player) => (
                    <li
                      key={player.id}
                      className={`rounded-lg border px-3 py-2 text-sm ${positionStyle(player.position)}`}
                    >
                      <Link
                        href={playerHref(player.espnPlayerId)}
                        className="font-medium hover:underline"
                      >
                        {player.name}
                      </Link>
                      <span className="ml-2 opacity-70">
                        {player.posRankLabel}
                        {player.nflTeam ? ` · ${player.nflTeam}` : ""}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="text-lg font-medium text-zinc-100">Your picks</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Round</th>
                <th className="px-3 py-2 font-medium">Pick</th>
                <th className="px-3 py-2 font-medium">Player</th>
                <th className="px-3 py-2 font-medium">Pos</th>
                <th className="px-3 py-2 font-medium">Board</th>
              </tr>
            </thead>
            <tbody>
              {userPicks.map((pick) => (
                <tr key={pick.overallPick} className="border-t border-zinc-800">
                  <td className="px-3 py-2 text-zinc-300">{pick.round}</td>
                  <td className="px-3 py-2 text-zinc-300">#{pick.overallPick}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={playerHref(pick.player.espnPlayerId)}
                      className="text-emerald-300 hover:underline"
                    >
                      {pick.player.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-zinc-400">{pick.player.position}</td>
                  <td className="px-3 py-2 text-zinc-400">#{pick.player.rank}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-lg border border-emerald-600 bg-emerald-600/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-600/20"
        >
          Draft again
        </button>
        <Link
          href="/draft"
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-600"
        >
          Draft archive
        </Link>
      </div>
    </div>
  );
}

export function MockDraftRoom({
  players,
  seasonYear,
  initialSlot = null,
}: {
  players: MockDraftPlayer[];
  seasonYear: number;
  initialSlot?: number | null;
}) {
  const [phase, setPhase] = useState<MockDraftPhase>(() =>
    initialSlot != null ? "drafting" : "slot-select",
  );
  const [userSlot, setUserSlot] = useState<number | null>(initialSlot);
  const [pickTimerLimit, setPickTimerLimit] = useState<number | null>(
    initialSlot != null ? null : MOCK_DRAFT.defaultPickTimerSeconds,
  );
  const [timerSeconds, setTimerSeconds] = useState<number>(
    MOCK_DRAFT.defaultPickTimerSeconds,
  );
  const [picks, setPicks] = useState<MockDraftPick[]>([]);
  const [panelExpanded, setPanelExpanded] = useState(true);
  const [boardExpanded, setBoardExpanded] = useState(false);
  const [cpuThinkingSlot, setCpuThinkingSlot] = useState<number | null>(null);
  const [panelTab, setPanelTab] = useState<SidePanelTab>("available");
  const [viewTeamSlot, setViewTeamSlot] = useState(initialSlot ?? 1);
  const cpuRunningRef = useRef(false);
  const desktopDrawerRef = useRef<HTMLDivElement>(null);
  const unifiedTrackRef = useRef<HTMLDivElement>(null);
  const unifiedBoardViewportRef = useRef<HTMLDivElement>(null);
  const unifiedBoardContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialSlot == null || typeof window === "undefined") return;
    if (!window.location.search.includes("slot=")) return;
    window.history.replaceState(null, "", window.location.pathname);
  }, [initialSlot]);

  const unifiedScroll = useUnifiedDraftScroll({
    enabled: phase === "drafting",
    trackRef: unifiedTrackRef,
    boardViewportRef: unifiedBoardViewportRef,
    boardContentRef: unifiedBoardContentRef,
    remeasureKey: picks.length + (panelExpanded ? 1 : 0),
  });

  const teams = useMemo(
    () => (userSlot ? buildTeams(userSlot) : []),
    [userSlot],
  );

  const currentOverallPick = picks.length + 1;
  const currentTeamSlot =
    currentOverallPick <= totalPicks()
      ? teamSlotForPick(currentOverallPick)
      : null;
  const isUserTurn =
    phase === "drafting" &&
    currentTeamSlot != null &&
    userSlot != null &&
    currentTeamSlot === userSlot;
  const pool = useMemo(
    () => availablePlayers(players, picks),
    [players, picks],
  );

  const boardSnippetWindows = useMemo(() => {
    if (currentTeamSlot == null) {
      return {
        roundWindow: { start: 1, end: Math.min(3, MOCK_DRAFT.rounds) },
      };
    }
    const currentRound = roundForPick(currentOverallPick);
    return {
      roundWindow: {
        start: Math.max(1, currentRound - 1),
        end: Math.min(MOCK_DRAFT.rounds, currentRound + 2),
      },
    };
  }, [currentTeamSlot, currentOverallPick]);

  const isMobile = useIsMobile();

  const resetTimer = useCallback(() => {
    setTimerSeconds(pickTimerLimit ?? MOCK_DRAFT.defaultPickTimerSeconds);
  }, [pickTimerLimit]);

  const makePick = useCallback(
    (player: MockDraftPlayer, teamSlot: number) => {
      setPicks((previous) => {
        const overallPick = previous.length + 1;
        const pick: MockDraftPick = {
          overallPick,
          round: roundForPick(overallPick),
          roundPick: roundPickNumber(overallPick),
          teamSlot,
          player,
        };
        return [...previous, pick];
      });
      resetTimer();
    },
    [resetTimer],
  );

  const runCpuPicks = useCallback(
    (startingLength: number, draftPicks: MockDraftPick[]) => {
      if (cpuRunningRef.current) return;
      cpuRunningRef.current = true;

      let workingPicks = [...draftPicks];

      const finishCpu = () => {
        cpuRunningRef.current = false;
        setCpuThinkingSlot(null);
      };

      const step = () => {
        if (workingPicks.length >= totalPicks()) {
          finishCpu();
          setPhase("recap");
          return;
        }

        const nextOverall = workingPicks.length + 1;
        const nextSlot = teamSlotForPick(nextOverall);

        if (userSlot != null && nextSlot === userSlot) {
          finishCpu();
          resetTimer();
          setPanelExpanded(true);
          setPanelTab("available");
          return;
        }

        setCpuThinkingSlot(nextSlot);

        window.setTimeout(() => {
          const remaining = availablePlayers(players, workingPicks);
          if (remaining.length === 0) {
            finishCpu();
            setPhase("recap");
            return;
          }

          const roster = rosterFromPicks(nextSlot, workingPicks);
          const round = roundForPick(nextOverall);
          const selected = cpuSelectPlayer(remaining, roster, round);
          const pick: MockDraftPick = {
            overallPick: nextOverall,
            round,
            roundPick: roundPickNumber(nextOverall),
            teamSlot: nextSlot,
            player: selected,
          };

          workingPicks = [...workingPicks, pick];
          setPicks(workingPicks);
          setCpuThinkingSlot(null);

          window.setTimeout(step, 60);
        }, MOCK_DRAFT.cpuPickDelayMs);
      };

      if (startingLength < totalPicks()) {
        step();
      } else {
        finishCpu();
        setPhase("recap");
      }
    },
    [players, userSlot, resetTimer],
  );

  useEffect(() => {
    if (phase === "drafting" && isDraftComplete(picks)) {
      setPhase("recap");
    }
  }, [phase, picks]);

  useEffect(() => {
    if (phase !== "drafting" || !isUserTurn || isDraftComplete(picks)) return;
    if (pickTimerLimit == null) return;

    if (timerSeconds <= 0) {
      const remaining = availablePlayers(players, picks);
      if (remaining.length > 0 && userSlot != null) {
        const roster = rosterFromPicks(userSlot, picks);
        const round = roundForPick(picks.length + 1);
        const selected = cpuSelectPlayer(remaining, roster, round);
        makePick(selected, userSlot);
      }
      return;
    }

    const interval = window.setInterval(() => {
      setTimerSeconds((previous) => previous - 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [
    phase,
    isUserTurn,
    timerSeconds,
    picks,
    players,
    userSlot,
    makePick,
    pickTimerLimit,
  ]);

  useEffect(() => {
    if (phase !== "drafting" || isUserTurn || isDraftComplete(picks)) return;
    runCpuPicks(picks.length, picks);
  }, [phase, isUserTurn, picks, runCpuPicks]);

  useEffect(() => {
    if (!isUserTurn) return;
    setPanelTab("available");
    setPanelExpanded(true);
  }, [isUserTurn]);

  const handleSlotSelect = (slot: number) => {
    setUserSlot(slot);
    setViewTeamSlot(slot);
    setPhase("timer-select");
  };

  const startDraft = useCallback((slot: number, timerSeconds: number | null) => {
    setUserSlot(slot);
    setViewTeamSlot(slot);
    setPickTimerLimit(timerSeconds);
    setTimerSeconds(timerSeconds ?? MOCK_DRAFT.defaultPickTimerSeconds);
    setPicks([]);
    setPhase("drafting");
    cpuRunningRef.current = false;
    setPanelExpanded(true);
    setBoardExpanded(false);
    setPanelTab("available");
    setCpuThinkingSlot(null);
  }, []);

  const handleTimerStart = (seconds: number | null) => {
    if (userSlot == null) return;
    startDraft(userSlot, seconds);
  };

  const handleUserDraft = (player: MockDraftPlayer) => {
    if (!isUserTurn || userSlot == null) return;
    makePick(player, userSlot);
  };

  const handleRestart = () => {
    setPhase("slot-select");
    setUserSlot(null);
    setPicks([]);
    setPickTimerLimit(MOCK_DRAFT.defaultPickTimerSeconds);
    setTimerSeconds(MOCK_DRAFT.defaultPickTimerSeconds);
    cpuRunningRef.current = false;
    setPanelExpanded(true);
    setBoardExpanded(false);
    setPanelTab("available");
    setCpuThinkingSlot(null);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  };

  const board = useMemo(
    () =>
      teams.length ? buildBoardColumns(teams, picks) : { columns: [], rounds: [] },
    [teams, picks],
  );

  if (players.length === 0) {
    return (
      <p className="text-zinc-500">
        No player data available yet. Import a season first, then try again.
      </p>
    );
  }

  if (phase === "slot-select" || (phase === "timer-select" && userSlot != null)) {
    return (
      <>
        <div className="md:hidden">
          <MobileDraftSetup />
        </div>
        <div className="hidden md:block">
          {phase === "slot-select" ? (
            <SlotPicker onSelect={handleSlotSelect} />
          ) : userSlot != null ? (
            <TimerSetup
              slot={userSlot}
              onBack={() => {
                setUserSlot(null);
                setPhase("slot-select");
              }}
              onStart={handleTimerStart}
            />
          ) : null}
        </div>
      </>
    );
  }

  if (phase === "recap" && userSlot != null) {
    return (
      <div className="space-y-6">
        <DraftBoard columns={board.columns} rounds={board.rounds} />
        <DraftRecap
          userSlot={userSlot}
          picks={picks}
          seasonYear={seasonYear}
          onRestart={handleRestart}
        />
      </div>
    );
  }

  const currentTeam = teams.find((team) => team.slot === currentTeamSlot);
  const thinkingTeam = teams.find((team) => team.slot === cpuThinkingSlot);
  const timerLabel =
    cpuThinkingSlot != null
      ? "···"
      : isUserTurn && pickTimerLimit != null
        ? formatTimer(timerSeconds)
        : isUserTurn
          ? "∞"
          : "CPU";

  const boardProps = {
    columns: board.columns,
    rounds: board.rounds,
    onClockTeamSlot: currentTeamSlot,
    onClockOverallPick: currentOverallPick,
    thinkingTeamSlot: cpuThinkingSlot,
  };

  const draftStatusHeader = (
    <div className="z-20 flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950 px-3 py-2 md:px-4 md:py-2">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-zinc-500">
          On the clock
        </p>
        <p className="truncate text-base font-semibold text-zinc-100">
          {cpuThinkingSlot != null
            ? `${thinkingTeam?.name ?? "CPU"} selecting…`
            : currentTeam?.isUser
              ? "Your pick"
              : currentTeam?.name ?? "—"}
        </p>
        <p className="text-xs text-zinc-400">
          Round {roundForPick(currentOverallPick)} · #{currentOverallPick}/
          {totalPicks()}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            Timer
          </p>
          <p
            className={`text-2xl font-semibold tabular-nums transition-colors duration-300 ${
              cpuThinkingSlot != null
                ? "text-zinc-400"
                : isUserTurn && pickTimerLimit != null && timerSeconds <= 15
                  ? "text-red-400"
                  : isUserTurn
                    ? "text-emerald-300"
                    : "text-zinc-500"
            }`}
          >
            {timerLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setBoardExpanded((open) => !open)}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 transition hover:border-emerald-600 hover:text-emerald-300"
        >
          {boardExpanded ? "Exit board" : "Full board"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {boardExpanded ? (
        <div className="draft-board-overlay fixed inset-0 z-50 flex flex-col bg-zinc-950">
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
            <p className="text-sm font-medium text-zinc-100">Full draft board</p>
            <button
              type="button"
              onClick={() => setBoardExpanded(false)}
              className="rounded-lg border border-emerald-600/70 bg-emerald-600/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-600/20"
            >
              Back to draft
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col p-3">
            {isMobile === true ? (
              <DraftBoard
                {...boardProps}
                scrollable
                fillAvailable
                mobileVisibleColumns={4.5}
                pinRoundLabels={false}
                mobileRoundWindow={MOCK_DRAFT.rounds}
                followOnClock={!isUserTurn}
              />
            ) : (
              <DraftBoard {...boardProps} appBoard />
            )}
          </div>
        </div>
      ) : null}

      {/* Mobile: nested regions preserved for small screens */}
      <div className="draft-room-shell flex min-h-[32rem] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 md:hidden">
        {draftStatusHeader}
        <div className="shrink-0 border-b border-zinc-800 px-2 py-2">
          <DraftBoard
            {...boardProps}
            scrollable
            followOnClock={!isUserTurn}
            roundWindow={boardSnippetWindows.roundWindow}
          />
        </div>
        <div className="draft-panel-shell flex min-h-0 flex-1 flex-col border-t border-zinc-800/80">
          <DraftSidePanel
            teams={teams}
            picks={picks}
            availablePlayers={pool}
            panelTab={panelTab}
            onPanelTabChange={setPanelTab}
            viewTeamSlot={viewTeamSlot}
            onViewTeamSlotChange={setViewTeamSlot}
            onDraft={handleUserDraft}
            canDraft={Boolean(isUserTurn)}
          />
        </div>
      </div>

      {/* Desktop: single page scroll → sticky workspace → board navigation */}
      <div className="draft-unified-root hidden md:block">
        <div
          ref={unifiedTrackRef}
          className="draft-unified-track"
          style={{ height: unifiedScroll.trackHeight }}
        >
          <div
            className="draft-unified-workspace sticky flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950"
            style={{
              top: unifiedScroll.stickyTop,
              height: unifiedScroll.workspaceHeight,
            }}
          >
            {draftStatusHeader}
            <div className="flex min-h-0 flex-1 flex-col">
              <div
                ref={unifiedBoardViewportRef}
                className={`draft-unified-board-viewport min-h-0 overflow-hidden ${
                  panelExpanded ? "flex-[0.28]" : "flex-1"
                }`}
              >
                <div
                  ref={unifiedBoardContentRef}
                  className="draft-unified-board-content"
                  style={{
                    transform: `translate3d(0, -${unifiedScroll.boardOffset}px, 0)`,
                  }}
                >
                  <DraftBoard {...boardProps} appBoard unifiedScroll />
                </div>
              </div>

              {panelExpanded ? (
                <div
                  ref={desktopDrawerRef}
                  className="draft-unified-panel flex min-h-0 flex-[0.72] flex-col overflow-hidden border-t border-zinc-800"
                >
                  <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/80 px-4 py-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Players & tools
                    </span>
                    <button
                      type="button"
                      onClick={() => setPanelExpanded(false)}
                      className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
                    >
                      Hide panel
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-hidden">
                    <DraftSidePanel
                      teams={teams}
                      picks={picks}
                      availablePlayers={pool}
                      panelTab={panelTab}
                      onPanelTabChange={setPanelTab}
                      viewTeamSlot={viewTeamSlot}
                      onViewTeamSlotChange={setViewTeamSlot}
                      onDraft={handleUserDraft}
                      canDraft={Boolean(isUserTurn)}
                      embeddedInDrawer
                      wheelCaptureRef={desktopDrawerRef}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {!panelExpanded ? (
          <button
            type="button"
            onClick={() => setPanelExpanded(true)}
            className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom,0px)+1rem)] right-6 z-40 flex items-center gap-2 rounded-xl border border-emerald-600/70 bg-zinc-900/95 px-4 py-3 text-sm font-medium text-emerald-300 shadow-lg shadow-black/40 backdrop-blur transition hover:border-emerald-500 hover:bg-emerald-600/15"
            aria-label="Show players and team panel"
          >
            <span>Show players</span>
            <span aria-hidden className="text-zinc-500">
              ▲
            </span>
          </button>
        ) : null}
      </div>
    </>
  );
}
