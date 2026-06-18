import Link from "next/link";

import { MockDraftRoom } from "@/components/MockDraftRoom";
import { MOCK_DRAFT } from "@/lib/league-settings";
import { getMockDraftPlayerPool } from "@/lib/services/mock-draft";

export const dynamic = "force-dynamic";

export default async function MockDraftPage({
  searchParams,
}: {
  searchParams: Promise<{ slot?: string }>;
}) {
  const { seasonYear, players } = await getMockDraftPlayerPool();
  const { slot } = await searchParams;
  const slotNumber = Number(slot);
  const initialSlot =
    Number.isInteger(slotNumber) &&
    slotNumber >= 1 &&
    slotNumber <= MOCK_DRAFT.teamCount
      ? slotNumber
      : null;

  return (
    <div className="draft-mock-page mx-auto w-full max-w-[1600px] px-3 py-2 md:px-4 md:py-2">
      <div className="draft-mock-page-header mb-1 hidden items-center justify-between gap-3 md:mb-1.5 md:flex">

        <h1 className="text-xl font-semibold tracking-tight text-zinc-100 md:text-lg">

          Mock Draft

        </h1>

        <Link

          href="/draft"

          className="shrink-0 text-xs text-zinc-500 transition hover:text-emerald-300"

        >

          ← Archive

        </Link>

      </div>

      <MockDraftRoom
        players={players}
        seasonYear={seasonYear}
        initialSlot={initialSlot}
      />
    </div>

  );

}


