import { jsonResponse } from "@/lib/api";
import { getMatchups } from "@/lib/services/matchups";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seasonYear = searchParams.get("year");
  const weekNumber = searchParams.get("week");
  return jsonResponse(
    await getMatchups({
      seasonYear: seasonYear ? Number(seasonYear) : undefined,
      weekNumber: weekNumber ? Number(weekNumber) : undefined,
    }),
  );
}
