import { jsonResponse } from "@/lib/api";
import { getOwners } from "@/lib/services/owners";

export async function GET() {
  return jsonResponse(await getOwners());
}
