export function playerHref(espnPlayerId: number): string {
  return `/players/${espnPlayerId}`;
}

export function isEspnPlayerId(value: string): boolean {
  return /^\d+$/.test(value);
}
