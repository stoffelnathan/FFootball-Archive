import "dotenv/config";
import { executeImport } from "../src/lib/import/execute-import";

async function main(): Promise<void> {
  const yearArgs = process.argv.slice(2);
  const years = yearArgs.length
    ? yearArgs.flatMap((arg) => arg.split(",")).map((value) => Number(value.trim()))
    : undefined;

  if (years?.some((year) => Number.isNaN(year))) {
    throw new Error("Season year arguments must be numbers, e.g. npm run import -- 2024");
  }

  const leagueId = Number(process.env.ESPN_LEAGUE_ID);
  console.log(`Starting ESPN import for league ${leagueId}...`);

  const summary = await executeImport({ years });

  console.log("Import complete.");
  console.log(`Imported: ${summary.yearsImported.join(", ") || "none"}`);
  if (summary.yearsSkipped.length) {
    console.log(`Skipped/failed: ${summary.yearsSkipped.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
