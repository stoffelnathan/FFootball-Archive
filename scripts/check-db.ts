import "dotenv/config";
import { prisma } from "@/lib/db";

async function main() {
  await prisma.$queryRaw`SELECT 1`;
  console.log("DB connection OK");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("DB connection failed:", err.message);
  process.exit(1);
});
