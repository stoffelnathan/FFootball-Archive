import { jsonResponse, notFound } from "@/lib/api";
import { getOwnerById } from "@/lib/services/owners";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const owner = await getOwnerById(id);
  if (!owner) return notFound("Owner not found");
  return jsonResponse(owner);
}
