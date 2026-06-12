type OwnerLike = { displayName: string };
type TeamLike = { teamName: string; owner: OwnerLike };

export function ownerLabel(owner: OwnerLike): string {
  return owner.displayName;
}

export function matchupLabel(home: TeamLike, away: TeamLike): string {
  return `${ownerLabel(home.owner)} vs ${ownerLabel(away.owner)}`;
}

export function teamCardTitle(team: TeamLike, score: number): string {
  return `${ownerLabel(team.owner)} — ${score.toFixed(2)} pts`;
}
