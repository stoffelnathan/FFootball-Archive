import { prisma } from "@/lib/db";

export async function getLeague() {
  return prisma.league.findFirst({
    include: {
      seasons: {
        orderBy: { year: "desc" },
        include: {
          champion: true,
          runnerUp: true,
          teams: { include: { owner: true } },
        },
      },
    },
  });
}

export async function getLeagueName(): Promise<string> {
  const league = await prisma.league.findFirst({ select: { name: true } });
  return league?.name ?? "Fantasy League Archive";
}
