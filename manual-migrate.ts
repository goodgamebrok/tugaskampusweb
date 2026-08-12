import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function migrateManually() {
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;`);
    console.log('Added avatar_url to users');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS testimonials (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
        message TEXT NOT NULL,
        rating INTEGER NOT NULL DEFAULT 5,
        status TEXT NOT NULL DEFAULT 'pending',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Created testimonials table');
  } catch (err) {
    console.error(err);
  }
}

migrateManually().then(() => process.exit(0));
