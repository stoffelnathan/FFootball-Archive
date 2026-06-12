import { jsonResponse } from "@/lib/api";
import { getPlayers } from "@/lib/services/players";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  return jsonResponse(await getPlayers(q));
}
