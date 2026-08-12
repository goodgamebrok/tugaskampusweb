import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function manualMigrate() {
  console.log("Starting manual migration...");

  try {
    // Add avatar_url to users if not exists
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;`);
    console.log("Added avatar_url to users table.");
  } catch (e) {
    console.log("Avatar URL column might already exist", e);
  }

  try {
    // Drop old testimonials table if exists
    await db.execute(sql`DROP TABLE IF EXISTS testimonials CASCADE;`);
    console.log("Dropped old testimonials table.");

    // Create new testimonials table
    await db.execute(sql`
      CREATE TABLE testimonials (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        rating INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("Created new testimonials table.");
  } catch (e) {
    console.error("Failed to create testimonials table:", e);
  }

  console.log("Migration finished.");
}

manualMigrate().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
