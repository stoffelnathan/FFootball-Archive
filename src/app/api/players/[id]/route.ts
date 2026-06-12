import { jsonResponse, notFound } from "@/lib/api";
import { getPlayerById } from "@/lib/services/players";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const player = await getPlayerById(id);
  if (!player) return notFound("Player not found");
  return jsonResponse(player);
}
