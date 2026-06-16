import Link from "next/link";
import { MockDraftRoom } from "@/components/MockDraftRoom";
import { PageShell } from "@/components/ui";
import { getMockDraftPlayerPool } from "@/lib/services/mock-draft";

export const dynamic = "force-dynamic";

export default async function MockDraftPage() {
  const { seasonYear, players } = await getMockDraftPlayerPool();

  return (
    <PageShell
      title="Mock Draft"
      subtitle="June 2026 Underdog ADP (half-PPR → full PPR + TE premium)"
      wide
      className="lg:py-4"
    >
      <div className="mb-3 shrink-0">
        <Link
          href="/draft"
          className="text-sm text-zinc-400 transition hover:text-emerald-300"
        >
          ← Draft archive
        </Link>
      </div>
      <MockDraftRoom players={players} seasonYear={seasonYear} />
    </PageShell>
  );
}
