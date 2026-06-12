import "dotenv/config";
import { resolveSeasonChampions } from "@/lib/import/champions";
import { prisma } from "@/lib/db";

async function main() {
  const seasons = await prisma.season.findMany({ orderBy: { year: "asc" } });

  for (const season of seasons) {
    await resolveSeasonChampions(season.id, season.year);
    const updated = await prisma.season.findUnique({
      where: { id: season.id },
      include: { champion: true, runnerUp: true },
    });
    console.log(
      `${season.year}: ${updated?.champion?.displayName} (runner-up: ${updated?.runnerUp?.displayName ?? "—"})`,
    );
  }

  const nathan = await prisma.owner.findFirst({
    where: { displayName: { contains: "Nathan", mode: "insensitive" } },
    include: { championOf: true },
  });
  console.log(
    `\nNathan titles: ${nathan?.championOf.map((s) => s.year).join(", ") || "none"}`,
  );

  await prisma.$disconnect();
}

main();
