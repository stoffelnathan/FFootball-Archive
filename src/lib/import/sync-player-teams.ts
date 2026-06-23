import "dotenv/config";
import { NFL_TEAM_NAMES, POSITION_NAMES } from "@/lib/espn/constants";
import {
  fetchFinalScoringPeriod,
  fetchPlayerCards,
  getEspnAuthFromEnv,
  getLeagueIdFromEnv,
} from "@/lib/espn/player-card";
import type { EspnPlayer } from "@/lib/espn/types";
import { prisma } from "@/lib/db";

const DEFAULT_SEASON_YEAR = 2026;
const BATCH_SIZE = 40;

function playerNflTeam(player: EspnPlayer): string | null {
  if (player.proTeamId == null) return null;
  return NFL_TEAM_NAMES[player.proTeamId] ?? `TEAM_${player.proTeamId}`;
}

function playerPosition(player: EspnPlayer): string {
  if (player.defaultPositionId == null) return "UNKNOWN";
  return POSITION_NAMES[player.defaultPositionId] ?? `POS_${player.defaultPositionId}`;
}

export async function syncPlayerTeamsFromEspn(
  seasonYear = DEFAULT_SEASON_YEAR,
  options?: { dryRun?: boolean; nameFilter?: string },
): Promise<{ updated: number; unchanged: number; skipped: number; changes: string[] }> {
  const players = await prisma.player.findMany({
    where: options?.nameFilter
      ? { name: { contains: options.nameFilter, mode: "insensitive" } }
      : undefined,
    select: {
      id: true,
      espnPlayerId: true,
      name: true,
      position: true,
      nflTeam: true,
    },
    orderBy: { name: "asc" },
  });

  const auth = getEspnAuthFromEnv();
  const leagueId = getLeagueIdFromEnv();
  const finalScoringPeriod = await fetchFinalScoringPeriod(
    seasonYear,
    leagueId,
    auth,
  );

  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  const changes: string[] = [];

  for (let index = 0; index < players.length; index += BATCH_SIZE) {
    const batch = players.slice(index, index + BATCH_SIZE);
    const cards = await fetchPlayerCards(
      seasonYear,
      leagueId,
      batch.map((player) => player.espnPlayerId),
      finalScoringPeriod,
      auth,
    );

    for (const player of batch) {
      const card = cards.get(player.espnPlayerId);
      if (!card) {
        skipped += 1;
        continue;
      }

      const nextTeam = playerNflTeam(card.player);
      const nextPosition = playerPosition(card.player);
      const teamChanged = nextTeam !== player.nflTeam;
      const positionChanged = nextPosition !== player.position;

      if (!teamChanged && !positionChanged) {
        unchanged += 1;
        continue;
      }

      const changeParts: string[] = [];
      if (teamChanged) {
        changeParts.push(`${player.nflTeam ?? "—"} → ${nextTeam ?? "—"}`);
      }
      if (positionChanged) {
        changeParts.push(`pos ${player.position} → ${nextPosition}`);
      }
      changes.push(`${player.name}: ${changeParts.join(", ")}`);

      if (!options?.dryRun) {
        await prisma.player.update({
          where: { id: player.id },
          data: {
            nflTeam: nextTeam,
            position: nextPosition,
          },
        });
      }

      updated += 1;
    }
  }

  return { updated, unchanged, skipped, changes };
}

