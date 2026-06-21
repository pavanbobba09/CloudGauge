import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getPool } from "../lib/db";

async function main() {
  const pool = getPool();
  if (!pool) throw new Error("DATABASE_URL is required");
  const sql = await readFile(resolve(process.cwd(), "db/schema.sql"), "utf8");
  await pool.query(sql);
  await pool.end();
  console.log("Database schema is up to date.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
