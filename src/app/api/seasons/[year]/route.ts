import { jsonResponse, notFound } from "@/lib/api";
import { getSeasonByYear } from "@/lib/services/seasons";
import { getAwardsForSeason } from "@/lib/services/awards";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ year: string }> },
) {
  const { year } = await params;
  const season = await getSeasonByYear(Number(year));
  if (!season) return notFound("Season not found");

  const awards = await getAwardsForSeason(Number(year));
  return jsonResponse({ ...season, computedAwards: awards });
}
