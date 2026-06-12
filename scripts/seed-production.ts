import "dotenv/config";
import { execSync } from "node:child_process";

function run(command: string) {
  console.log(`\n> ${command}\n`);
  execSync(command, { stdio: "inherit", env: process.env });
}

async function main() {
  const years = process.argv.slice(2);
  const importCmd =
    years.length > 0
      ? `npm run import -- ${years.join(" ")}`
      : "npm run import";

  run(importCmd);
  run("npm run db:backfill-stats");
  run("npm run db:backfill-weekly");
  run("npm run db:fix-champions");
  console.log("\nProduction seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
