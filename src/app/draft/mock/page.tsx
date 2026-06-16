import Link from "next/link";
import { MockDraftRoom } from "@/components/MockDraftRoom";
import { getMockDraftPlayerPool } from "@/lib/services/mock-draft";

export const dynamic = "force-dynamic";

export default async function MockDraftPage() {
  const { seasonYear, players } = await getMockDraftPlayerPool();
  const deploySha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";

  return (
    <div className="mx-auto flex min-h-0 flex-1 flex-col px-4 py-4 max-w-[1600px] lg:py-3">
      <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/draft"
            className="text-sm text-zinc-400 transition hover:text-emerald-300"
          >
            ← Draft archive
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100 lg:text-3xl">
            Mock Draft
          </h1>
          <p className="mt-1 text-sm text-zinc-400 lg:text-base">
            June 2026 Underdog ADP (half-PPR → full PPR + TE premium)
          </p>
        </div>
        <p className="shrink-0 pt-8 text-xs font-medium text-emerald-400/80">
          v{deploySha}
        </p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <MockDraftRoom players={players} seasonYear={seasonYear} />
      </div>
    </div>
  );
}
