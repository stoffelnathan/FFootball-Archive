import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import pg from "pg";

const PRISMA_SCHEMA_VERSION = 2;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: pg.Pool | undefined;
  prismaSchemaVersion?: number;
};

const REQUIRED_PRISMA_MODELS = ["playerSeasonStat", "playerProWeekStat"] as const;

function isPrismaClientReady(
  client: PrismaClient | undefined,
): client is PrismaClient {
  return Boolean(
    client &&
      globalForPrisma.prismaSchemaVersion === PRISMA_SCHEMA_VERSION &&
      REQUIRED_PRISMA_MODELS.every((model) => model in client),
  );
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool =
    globalForPrisma.pgPool ??
    new pg.Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

  pool.on("error", () => {
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.pgPool = undefined;
      globalForPrisma.prisma = undefined;
    }
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }

  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });
  globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
  return client;
}

function resolvePrismaClient(): PrismaClient {
  if (isPrismaClientReady(globalForPrisma.prisma)) {
    return globalForPrisma.prisma;
  }

  globalForPrisma.prisma = undefined;

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = resolvePrismaClient();
    const value = client[prop as keyof PrismaClient];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});
