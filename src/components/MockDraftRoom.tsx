"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DraftBoard } from "@/components/DraftBoard";
import { positionStyle } from "@/lib/position-colors";
import { playerHref } from "@/lib/player-url";
import { MOCK_DRAFT, STARTER_COUNT } from "@/lib/league-settings";
import {
  availablePlayers,
  buildTeams,
  cpuSelectPlayer,
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

function SlotPicker({
  onSelect,
}: {
  onSelect: (slot: number) => void;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h2 className="text-xl font-semibold text-zinc-100">Choose your draft slot</h2>
        <p className="mt-2 text-sm text-zinc-400">
          12-team snake draft · {MOCK_DRAFT.rounds} rounds ·{" "}
          {MOCK_DRAFT.pickTimerSeconds / 60} minutes per pick · 1 QB / 2 RB / 2 WR /
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

function PlayerPool({
  players,
  onDraft,
  canDraft,
}: {
  players: MockDraftPlayer[];
  onDraft: (player: MockDraftPlayer) => void;
  canDraft: boolean;
}) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<string>("ALL");

  const filtered = useMemo(() => {
    return players.filter((player) => {
      if (position !== "ALL" && player.position !== position) return false;
      if (!query.trim()) return true;
      return player.name.toLowerCase().includes(query.trim().toLowerCase());
    });
  }, [players, position, query]);

  return (
    <div className="flex min-h-0 flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60">
      <div className="border-b border-zinc-800 p-4">
        <h3 className="font-medium text-zinc-100">Available players</h3>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search players…"
          className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {["ALL", "QB", "RB", "WR", "TE"].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPosition(option)}
              className={`rounded-full border px-3 py-1 text-xs ${
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
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">No players match your filters.</p>
        ) : (
          <ul className="space-y-1">
            {filtered.slice(0, 120).map((player) => (
              <li key={player.id}>
                <button
                  type="button"
                  disabled={!canDraft}
                  onClick={() => onDraft(player)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition ${
                    canDraft
                      ? "border-zinc-800 hover:border-emerald-700/60 hover:bg-zinc-950/80"
                      : "cursor-not-allowed border-zinc-900 opacity-60"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-100">
                      #{player.rank} {player.name}
                    </p>
                    <p className="text-xs text-zinc-500">
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
  const [picks, setPicks] = useState<MockDraftPick[]>([]);
  const [timerSeconds, setTimerSeconds] = useState<number>(
    MOCK_DRAFT.pickTimerSeconds,
  );
  const cpuRunningRef = useRef(false);

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

  const makePick = useCallback((player: MockDraftPlayer, teamSlot: number) => {
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
    setTimerSeconds(MOCK_DRAFT.pickTimerSeconds);
  }, []);

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
          setTimerSeconds(MOCK_DRAFT.pickTimerSeconds);
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
    [players, userSlot],
  );

  useEffect(() => {
    if (phase === "drafting" && isDraftComplete(picks)) {
      setPhase("recap");
    }
  }, [phase, picks]);

  useEffect(() => {
    if (phase !== "drafting" || !isUserTurn || isDraftComplete(picks)) return;

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
  }, [phase, isUserTurn, timerSeconds, picks, players, userSlot, makePick]);

  useEffect(() => {
    if (phase !== "drafting" || isUserTurn || isDraftComplete(picks)) return;
    runCpuPicks(picks.length, picks);
  }, [phase, isUserTurn, picks, runCpuPicks]);

  const handleSlotSelect = (slot: number) => {
    setUserSlot(slot);
    setPicks([]);
    setTimerSeconds(MOCK_DRAFT.pickTimerSeconds);
    setPhase("drafting");
    cpuRunningRef.current = false;
  };

  const handleUserDraft = (player: MockDraftPlayer) => {
    if (!isUserTurn || userSlot == null) return;
    makePick(player, userSlot);
  };

  const handleRestart = () => {
    setPhase("slot-select");
    setUserSlot(null);
    setPicks([]);
    setTimerSeconds(MOCK_DRAFT.pickTimerSeconds);
    cpuRunningRef.current = false;
  };

  const board = useMemo(
    () => (teams.length ? buildBoardColumns(teams, picks) : { columns: [], rounds: [] }),
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">On the clock</p>
          <p className="text-lg font-semibold text-zinc-100">
            {currentTeam?.isUser ? "Your pick" : currentTeam?.name ?? "—"}
          </p>
          <p className="text-sm text-zinc-400">
            Round {roundForPick(currentOverallPick)} · Pick #{currentOverallPick} of{" "}
            {totalPicks()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Timer</p>
          <p
            className={`text-3xl font-semibold tabular-nums ${
              isUserTurn && timerSeconds <= 15
                ? "text-red-400"
                : isUserTurn
                  ? "text-emerald-300"
                  : "text-zinc-500"
            }`}
          >
            {isUserTurn ? formatTimer(timerSeconds) : "CPU"}
          </p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-h-0 lg:flex lg:flex-col">
          <DraftBoard columns={board.columns} rounds={board.rounds} />
        </div>
        <div className="min-h-[24rem] lg:min-h-0 lg:h-full">
          <PlayerPool
            players={pool}
            onDraft={handleUserDraft}
            canDraft={Boolean(isUserTurn)}
          />
        </div>
      </div>
    </div>
  );
}
