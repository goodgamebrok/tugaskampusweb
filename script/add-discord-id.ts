import "dotenv/config";
import pg from "pg";

async function run() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query('ALTER TABLE "keys" ADD COLUMN "discord_id" text;');
    console.log("Column discord_id added to keys table.");
  } catch (err: any) {
    if (err.code === '42701') {
      console.log("Column discord_id already exists.");
    } else {
      console.error(err);
    }
  } finally {
    await pool.end();
  }
}

run();
