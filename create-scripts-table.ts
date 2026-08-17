import { sql } from "drizzle-orm";
import { db } from "./server/db";

async function main() {
  console.log("Creating scripts table...");
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "scripts" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "content" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "scripts_name_unique" UNIQUE("name")
      );
    `);
    console.log("Successfully created scripts table!");
  } catch (error) {
    console.error("Error creating table:", error);
  }
  process.exit(0);
}

main();
