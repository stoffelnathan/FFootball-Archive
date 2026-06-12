import { prisma } from "@/lib/db";

const draftPickInclude = {
  player: true,
  season: true,
  team: { include: { owner: true } },
} as const;

export async function getDraftPicks(seasonYear?: number) {
  return prisma.draftPick.findMany({
    where: seasonYear ? { season: { year: seasonYear } } : undefined,
    include: draftPickInclude,
    orderBy: [{ season: { year: "desc" } }, { overallPick: "asc" }],
  });
}

export type DraftBoardCell = {
  id: string;
  round: number;
  overallPick: number;
  roundPick: number;
  player: {
    id: string;
    name: string;
    position: string;
    nflTeam: string | null;
    espnPlayerId: number;
  };
  ownerName: string;
};

export type DraftBoardColumn = {
  teamId: string;
  ownerName: string;
  teamName: string;
  cells: Array<DraftBoardCell | null>;
};

export async function getDraftBoard(seasonYear: number): Promise<{
  seasonYear: number;
  rounds: number[];
  columns: DraftBoardColumn[];
}> {
  const picks = await getDraftPicks(seasonYear);
  if (picks.length === 0) {
    return { seasonYear, rounds: [], columns: [] };
  }

  const maxRound = Math.max(...picks.map((pick) => pick.round));
  const rounds = Array.from({ length: maxRound }, (_, index) => index + 1);

  const picksByRound = new Map<number, typeof picks>();
  for (const round of rounds) {
    picksByRound.set(
      round,
      picks
        .filter((pick) => pick.round === round)
        .sort((a, b) => a.overallPick - b.overallPick),
    );
  }

  const roundPickNumbers = new Map<string, number>();
  for (const round of rounds) {
    picksByRound.get(round)?.forEach((pick, index) => {
      roundPickNumbers.set(pick.id, index + 1);
    });
  }

  const byTeam = new Map<string, typeof picks>();
  for (const pick of picks) {
    const teamPicks = byTeam.get(pick.teamId) ?? [];
    teamPicks.push(pick);
    byTeam.set(pick.teamId, teamPicks);
  }

  const columns = [...byTeam.entries()]
    .map(([teamId, teamPicks]) => {
      const draftSlot =
        teamPicks.find((pick) => pick.round === 1)?.overallPick ??
        Math.min(...teamPicks.map((pick) => pick.overallPick));
      const picksByRoundForTeam = new Map(
        teamPicks.map((pick) => [pick.round, pick]),
      );

      return {
        teamId,
        ownerName: teamPicks[0].team.owner.displayName,
        teamName: teamPicks[0].team.teamName,
        draftSlot,
        cells: rounds.map((round) => {
          const pick = picksByRoundForTeam.get(round);
          if (!pick) return null;

          return {
            id: pick.id,
            round: pick.round,
            overallPick: pick.overallPick,
            roundPick: roundPickNumbers.get(pick.id) ?? 1,
            player: {
              id: pick.player.id,
              name: pick.player.name,
              position: pick.player.position,
              nflTeam: pick.player.nflTeam,
              espnPlayerId: pick.player.espnPlayerId,
            },
            ownerName: pick.team.owner.displayName,
          };
        }),
      };
    })
    .sort((a, b) => a.draftSlot - b.draftSlot)
    .map(({ draftSlot: _draftSlot, ...column }) => column);

  return { seasonYear, rounds, columns };
}

export async function getDraftPickById(pickId: string) {
  const pick = await prisma.draftPick.findUnique({
    where: { id: pickId },
    include: {
      player: true,
      season: true,
      team: { include: { owner: true } },
    },
  });

  if (!pick) return null;

  const seasonPoints = await prisma.weeklyPlayerScore.aggregate({
    where: {
      playerId: pick.playerId,
      week: { seasonId: pick.seasonId },
    },
    _sum: { fantasyPoints: true },
  });

  return {
    pick,
    seasonPoints: seasonPoints._sum.fantasyPoints ?? 0,
  };
}

export async function getDraftSeasons() {
  const seasons = await prisma.season.findMany({
    select: { year: true, id: true },
    orderBy: { year: "desc" },
  });
  return seasons;
}
