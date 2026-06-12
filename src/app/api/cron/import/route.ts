import { NextRequest, NextResponse } from "next/server";
import { executeImport } from "@/lib/import/execute-import";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  return request.headers.get("x-cron-secret") === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const currentYear = new Date().getFullYear();
    const result = await executeImport({
      years: [currentYear - 1, currentYear],
    });

    return NextResponse.json({
      ok: true,
      message: "Weekly ESPN sync completed",
      ...result,
    });
  } catch (error) {
    console.error("Cron import failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Import failed",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
