import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function dropTestimonials() {
  await db.execute(sql`DROP TABLE IF EXISTS testimonials CASCADE;`);
  console.log('Dropped testimonials table');
}

dropTestimonials().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
