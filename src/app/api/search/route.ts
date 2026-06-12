import { jsonResponse } from "@/lib/api";
import { searchAll } from "@/lib/services/awards";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  return jsonResponse(await searchAll(q));
}
