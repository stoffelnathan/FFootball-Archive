import { jsonResponse } from "@/lib/api";
import { getDraftPicks } from "@/lib/services/draft";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  return jsonResponse(await getDraftPicks(year ? Number(year) : undefined));
}
