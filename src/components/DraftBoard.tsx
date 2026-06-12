import Link from "next/link";
import { positionLegend, positionStyle } from "@/lib/position-colors";
import { playerHref } from "@/lib/player-url";
import type { DraftBoardColumn } from "@/lib/services/draft";

function DraftPickCell({
  cell,
}: {
  cell: NonNullable<DraftBoardColumn["cells"][number]>;
}) {
  return (
    <div
      className={`flex h-full min-h-[4.5rem] flex-col justify-between rounded-lg border p-2 ${positionStyle(cell.player.position)}`}
    >
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide opacity-80">
          {cell.round}.{String(cell.roundPick).padStart(2, "0")} · #{cell.overallPick}
        </p>
        <Link
          href={playerHref(cell.player.espnPlayerId)}
          className="mt-0.5 block text-xs font-semibold leading-snug hover:underline"
        >
          {cell.player.name}
        </Link>
      </div>
      <p className="text-[10px] leading-tight opacity-80">
        {cell.player.position}
        {cell.player.nflTeam ? ` · ${cell.player.nflTeam}` : ""}
      </p>
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
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {positionLegend().map(({ position, style }) => (
          <span
            key={position}
            className={`rounded-full border px-2 py-0.5 text-[10px] ${style}`}
          >
            {position}
          </span>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-800">
        <div
          className="grid w-full gap-1 p-2"
          style={{
            gridTemplateColumns: `2.5rem repeat(${columns.length}, minmax(0, 1fr))`,
          }}
        >
          <div className="flex items-end px-1 pb-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Rd
          </div>
          {columns.map((column) => (
            <div
              key={column.teamId}
              className="rounded-md bg-zinc-900/80 px-1 py-2 text-center"
            >
              <p className="truncate text-[11px] font-semibold text-zinc-100">
                {column.ownerName}
              </p>
              <p className="truncate text-[10px] text-zinc-500">{column.teamName}</p>
            </div>
          ))}

          {rounds.map((round, roundIndex) => (
            <div key={round} className="contents">
              <div className="flex items-center px-1 text-xs font-medium text-zinc-400">
                {round}
              </div>
              {columns.map((column) => {
                const cell = column.cells[roundIndex];
                return (
                  <div key={`${column.teamId}-${round}`} className="min-h-[4.5rem]">
                    {cell ? (
                      <DraftPickCell cell={cell} />
                    ) : (
                      <div className="h-full min-h-[4.5rem] rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
