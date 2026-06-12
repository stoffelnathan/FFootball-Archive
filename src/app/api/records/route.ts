import { jsonResponse } from "@/lib/api";
import { getLeagueRecords } from "@/lib/services/seasons";

export async function GET() {
  return jsonResponse(await getLeagueRecords());
}
