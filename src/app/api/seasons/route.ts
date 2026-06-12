import { jsonResponse } from "@/lib/api";
import { getSeasonsList } from "@/lib/services/seasons";

export async function GET() {
  const seasons = await getSeasonsList();
  return jsonResponse(seasons);
}
