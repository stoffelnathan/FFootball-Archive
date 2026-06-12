import { jsonResponse, notFound } from "@/lib/api";
import { getMatchupById } from "@/lib/services/matchups";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const matchup = await getMatchupById(id);
  if (!matchup) return notFound("Matchup not found");
  return jsonResponse(matchup);
}
