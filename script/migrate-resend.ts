import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified integer DEFAULT 0 NOT NULL;
    `);
    console.log("Added is_email_verified to users");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS otps (
        id serial PRIMARY KEY NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code varchar(6) NOT NULL,
        purpose text NOT NULL,
        expires_at timestamp NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log("Created otps table");

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
