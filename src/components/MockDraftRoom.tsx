"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function SlotPicker({ onSelect }: { onSelect: (slot: number) => void }) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h2 className="text-xl font-semibold text-zinc-100">Choose your draft slot</h2>
        <p className="mt-2 text-sm text-zinc-400">
          12-team snake draft · {MOCK_DRAFT.rounds} rounds · 1 QB / 2 RB / 2 WR /
          2 FLEX / 1 TE · TE premium (1.5 PPR)
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {Array.from({ length: MOCK_DRAFT.teamCount }, (_, index) => {
            const slot = index + 1;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => onSelect(slot)}
                className="rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-5 text-center transition hover:border-emerald-600 hover:bg-emerald-600/10"
              >
                <span className="block text-2xl font-semibold text-zinc-100">
                  {slot}
                </span>
                <span className="mt-1 block text-[11px] uppercase tracking-wide text-zinc-500">
                  Pick
                </span>
              </button>
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
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<string>("ALL");

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
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-zinc-950">
      <div className="flex shrink-0 flex-col gap-2 border-b border-zinc-800 px-3 py-2 md:px-4">
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
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200 md:hidden"
          >
            Close
          </button>
        </div>
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
      </div>
      {panelTab === "available" ? (
        <div className="shrink-0 border-b border-zinc-800 px-3 py-2 md:px-4">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search players…"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 md:py-2"
          />
          <div className="mt-1.5 flex flex-wrap gap-1 md:mt-2 md:gap-1.5">
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
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 md:px-4 md:py-3">
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
}: {
  players: MockDraftPlayer[];
  seasonYear: number;
}) {
  const [phase, setPhase] = useState<MockDraftPhase>("slot-select");
  const [userSlot, setUserSlot] = useState<number | null>(null);
  const [pickTimerLimit, setPickTimerLimit] = useState<number | null>(
    MOCK_DRAFT.defaultPickTimerSeconds,
  );
  const [timerSeconds, setTimerSeconds] = useState<number>(
    MOCK_DRAFT.defaultPickTimerSeconds,
  );
  const [picks, setPicks] = useState<MockDraftPick[]>([]);
  const [showPlayerOverlay, setShowPlayerOverlay] = useState(true);
  const [mobilePane, setMobilePane] = useState<"board" | "players">("board");
  const [boardFullscreen, setBoardFullscreen] = useState(false);
  const [panelTab, setPanelTab] = useState<SidePanelTab>("available");
  const [viewTeamSlot, setViewTeamSlot] = useState(1);
  const cpuRunningRef = useRef(false);
  const boardContainerRef = useRef<HTMLDivElement>(null);

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

      const step = () => {
        if (workingPicks.length >= totalPicks()) {
          cpuRunningRef.current = false;
          setPhase("recap");
          return;
        }

        const nextOverall = workingPicks.length + 1;
        const nextSlot = teamSlotForPick(nextOverall);

        if (userSlot != null && nextSlot === userSlot) {
          cpuRunningRef.current = false;
          resetTimer();
          setShowPlayerOverlay(true);
          return;
        }

        const remaining = availablePlayers(players, workingPicks);
        if (remaining.length === 0) {
          cpuRunningRef.current = false;
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

        window.setTimeout(step, 120);
      };

      if (startingLength < totalPicks()) {
        window.setTimeout(step, 120);
      } else {
        cpuRunningRef.current = false;
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
    if (!isUserTurn) {
      setMobilePane("board");
      return;
    }
    setShowPlayerOverlay(true);
    setMobilePane("players");
    setPanelTab("available");
  }, [isUserTurn]);

  useEffect(() => {
    if (phase !== "drafting") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [phase]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setBoardFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleBoardFullscreen = async () => {
    const node = boardContainerRef.current;
    if (!node) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await node.requestFullscreen();
    }
  };

  const showSidePanel = showPlayerOverlay && !boardFullscreen;

  const handleSlotSelect = (slot: number) => {
    setUserSlot(slot);
    setViewTeamSlot(slot);
    setPhase("timer-select");
  };

  const handleTimerStart = (seconds: number | null) => {
    setPickTimerLimit(seconds);
    setTimerSeconds(seconds ?? MOCK_DRAFT.defaultPickTimerSeconds);
    setPicks([]);
    setPhase("drafting");
    cpuRunningRef.current = false;
    setShowPlayerOverlay(true);
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
    setShowPlayerOverlay(true);
    setPanelTab("available");
    if (document.fullscreenElement) {
      void document.exitFullscreen();
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

  if (phase === "slot-select") {
    return <SlotPicker onSelect={handleSlotSelect} />;
  }

  if (phase === "timer-select" && userSlot != null) {
    return (
      <TimerSetup
        slot={userSlot}
        onBack={() => {
          setUserSlot(null);
          setPhase("slot-select");
        }}
        onStart={handleTimerStart}
      />
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
  const timerLabel =
    isUserTurn && pickTimerLimit != null
      ? formatTimer(timerSeconds)
      : isUserTurn
        ? "∞"
        : "CPU";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      <div className="z-20 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            On the clock
          </p>
          <p className="truncate text-base font-semibold text-zinc-100">
            {currentTeam?.isUser ? "Your pick" : currentTeam?.name ?? "—"}
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
              className={`text-2xl font-semibold tabular-nums ${
                isUserTurn && pickTimerLimit != null && timerSeconds <= 15
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
            onClick={() => {
              setShowPlayerOverlay((open) => {
                const next = !open;
                if (next) setMobilePane("players");
                return next;
              });
            }}
            className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
              showPlayerOverlay
                ? "border-emerald-600 bg-emerald-600/10 text-emerald-300"
                : "border-zinc-700 text-zinc-300 hover:border-zinc-600"
            }`}
          >
            {showPlayerOverlay ? "Hide players" : "Show players"}
          </button>
          <button
            type="button"
            onClick={() => void toggleBoardFullscreen()}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 transition hover:border-zinc-600"
          >
            {boardFullscreen ? "Exit fullscreen" : "Fullscreen board"}
          </button>
        </div>
      </div>

      {showSidePanel ? (
        <div className="flex shrink-0 gap-1 border-b border-zinc-800 px-3 py-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobilePane("board")}
            className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              mobilePane === "board"
                ? "border-emerald-600 bg-emerald-600/10 text-emerald-300"
                : "border-zinc-700 text-zinc-400"
            }`}
          >
            Draft board
          </button>
          <button
            type="button"
            onClick={() => setMobilePane("players")}
            className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              mobilePane === "players"
                ? "border-emerald-600 bg-emerald-600/10 text-emerald-300"
                : "border-zinc-700 text-zinc-400"
            }`}
          >
            Players
          </button>
        </div>
      ) : null}

      <div
        ref={boardContainerRef}
        className={`relative flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950 ${
          showSidePanel
            ? "md:grid md:grid-cols-[minmax(0,1fr)_min(20rem,34vw)]"
            : ""
        }`}
      >
        {boardFullscreen ? (
          <button
            type="button"
            onClick={() => void document.exitFullscreen()}
            className="fixed bottom-4 right-4 z-50 rounded-lg border border-zinc-600 bg-zinc-900/95 px-4 py-2.5 text-sm font-medium text-zinc-100 shadow-lg backdrop-blur transition hover:border-emerald-600 hover:bg-zinc-900 hover:text-emerald-300"
          >
            Exit fullscreen
          </button>
        ) : null}

        <div
          className={`scrollbar-hidden min-h-0 overflow-auto overscroll-contain ${
            showSidePanel
              ? `min-h-0 flex-1 ${mobilePane === "players" ? "hidden md:block" : "block"} md:border-r md:border-zinc-800`
              : "flex-1"
          }`}
        >
          <div className="min-w-max p-2">
            <DraftBoard
              columns={board.columns}
              rounds={board.rounds}
              scrollable
            />
          </div>
        </div>

        {showSidePanel ? (
          <div
            className={`flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950/80 ${
              mobilePane === "board" ? "hidden md:flex" : "flex"
            }`}
          >
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
              onClose={() => setShowPlayerOverlay(false)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
