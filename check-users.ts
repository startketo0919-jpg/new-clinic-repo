import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';

async function check() {
  const allUsers = await db.select().from(users);
  console.log(allUsers);
  process.exit(0);
}
check();
