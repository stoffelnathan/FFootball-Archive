import { jsonResponse } from "@/lib/api";
import { getAllAwards, getAwardsForSeason } from "@/lib/services/awards";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  if (year) return jsonResponse(await getAwardsForSeason(Number(year)));
  return jsonResponse(await getAllAwards());
}
