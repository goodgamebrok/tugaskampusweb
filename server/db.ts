import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Auto-migrate folder column for scripts table
pool.query(`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'scripts' AND column_name = 'folder'
    ) THEN
      ALTER TABLE "scripts" ADD COLUMN "folder" text;
    END IF;
  END $$;
`).catch(err => console.error("Auto-migrate folder column failed:", err));

// Auto-migrate trial_devices table
pool.query(`
  CREATE TABLE IF NOT EXISTS "trial_devices" (
    "id" serial PRIMARY KEY NOT NULL,
    "hwid" text NOT NULL,
    "first_used_at" timestamp DEFAULT now() NOT NULL,
    "last_seen_at" timestamp DEFAULT now() NOT NULL,
    "is_active" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "trial_devices_hwid_unique" UNIQUE("hwid")
  );
`).catch(err => console.error("Auto-migrate trial_devices failed:", err));
