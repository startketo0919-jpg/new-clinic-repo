import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function update() {
  await db.update(users).set({ email: 'skgservicesin@gmail.com' }).where(eq(users.username, 'admin'));
  console.log("Updated admin email");
  process.exit(0);
}
update();
