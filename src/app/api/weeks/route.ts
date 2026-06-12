import { jsonResponse } from "@/lib/api";
import { getWeeksBySeasonYear } from "@/lib/services/matchups";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  if (!year) {
    return jsonResponse({ error: "year query param required" }, 400);
  }
  return jsonResponse(await getWeeksBySeasonYear(year));
}
