import { db } from "./src/db/index.js";
import { liveQueue, patientRegistry } from "./src/db/schema.js";
import { eq } from "drizzle-orm";

async function main() {
  await db.delete(liveQueue).where(eq(liveQueue.id, "123"));
  await db.delete(liveQueue).where(eq(liveQueue.id, "1234"));
  await db.delete(patientRegistry).where(eq(patientRegistry.clinicId, "PID-0002"));
  console.log("Deleted test data");
}
main();
