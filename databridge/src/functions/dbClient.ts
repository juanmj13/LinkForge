import { Pool } from "pg";

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_DATABASE,
} = process.env;

if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_DATABASE) {
  throw new Error("Database connection environment variables are missing");
}

export const pool = new Pool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
});

pool.on("error", (err) => {
  console.error("[DB ERROR] Unexpected error on idle client", err);
  process.exit(1); // crash to restart Docker
});

export async function closePool() {
  await pool.end();
  console.log("[INFO] PostgreSQL pool closed");
}
