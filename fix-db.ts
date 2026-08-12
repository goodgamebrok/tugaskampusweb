import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function fixDb() {
  await db.execute(sql`DROP TABLE IF EXISTS __drizzle_migrations CASCADE;`);
  console.log('Cleared drizzle state');
}

fixDb().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
