import "dotenv/config";
import { syncPlayerTeamsFromEspn } from "@/lib/import/sync-player-teams";
import { prisma } from "@/lib/db";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const yearArg = args.find((arg) => /^\d{4}$/.test(arg));
  const seasonYear = yearArg ? Number(yearArg) : 2026;
  const nameFilter =
    args
      .filter((arg) => arg !== "--dry-run" && !/^\d{4}$/.test(arg))
      .join(" ")
      .trim() || undefined;

  const result = await syncPlayerTeamsFromEspn(seasonYear, { dryRun, nameFilter });
  console.log(
    `${dryRun ? "Would update" : "Updated"} ${result.updated}, unchanged ${result.unchanged}, skipped ${result.skipped}`,
  );
  for (const change of result.changes) {
    console.log(`  ${change}`);
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
