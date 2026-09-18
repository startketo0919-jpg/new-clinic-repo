import { db } from './src/db/index.js';
import { settings } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function run() {
  const s = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
  console.log("DB value:", JSON.stringify(s[0].delhiveryApiKey));
  process.exit(0);
}
run().catch(console.error);
