import Link from "next/link";
import { DataTable, PageShell } from "@/components/ui";
import { getOwners } from "@/lib/services/owners";
import { formatRecord } from "@/lib/types";

export default async function OwnersPage() {
  const owners = await getOwners();

  return (
    <PageShell title="Owners" subtitle="Career profiles for every manager">
      <DataTable
        headers={["Owner", "Record", "Titles", "PF", "PA", "Win %"]}
        rows={owners
          .sort((a, b) => b.wins - a.wins)
          .map((owner) => [
            <Link key={owner.ownerId} href={`/owners/${owner.ownerId}`} className="text-emerald-300 hover:underline">
              {owner.displayName}
            </Link>,
            formatRecord(owner.wins, owner.losses, owner.ties),
            owner.championships,
            owner.pointsFor.toFixed(2),
            owner.pointsAgainst.toFixed(2),
            `${(owner.winPercentage * 100).toFixed(1)}%`,
          ])}
      />
    </PageShell>
  );
}
