import { jsonResponse } from "@/lib/api";
import { getAnalytics } from "@/lib/services/awards";

export async function GET() {
  return jsonResponse(await getAnalytics());
}
