import "dotenv/config";
import pg from "pg";

const adminUrl =
  process.env.NATIVE_DATABASE_ADMIN_URL ??
  "postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable";

const targetDb = "ffootball_archive";
const targetUrl = `postgres://postgres:postgres@localhost:5432/${targetDb}?sslmode=disable`;

async function main() {
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();

  const exists = await admin.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [targetDb],
  );

  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE ${targetDb}`);
    console.log(`Created database ${targetDb}`);
  } else {
    console.log(`Database ${targetDb} already exists`);
  }

  await admin.end();

  const test = new pg.Client({ connectionString: targetUrl });
  await test.connect();
  await test.query("SELECT 1");
  await test.end();
  console.log("Native PostgreSQL connection OK");
  console.log(`Use DATABASE_URL=${targetUrl}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
