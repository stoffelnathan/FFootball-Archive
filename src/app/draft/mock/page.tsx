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
      subtitle={`12-team snake draft ranked for our league settings (${seasonYear} scoring)`}
      wide
      className="lg:flex lg:min-h-[calc(100dvh-4.5rem)] lg:flex-col lg:py-6"
    >
      <div className="mb-4 shrink-0">
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
