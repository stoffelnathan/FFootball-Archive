import { jsonResponse } from "@/lib/api";
import { getHeadToHead } from "@/lib/services/awards";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const a = searchParams.get("a");
  const b = searchParams.get("b");
  if (!a || !b) {
    return jsonResponse({ error: "a and b query params required" }, 400);
  }
  return jsonResponse(await getHeadToHead(a, b));
}
