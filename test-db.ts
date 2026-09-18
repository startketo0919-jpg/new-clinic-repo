import { db } from "./src/db/index.js";
import { liveQueue, patientRegistry, users, appointments, settings } from "./src/db/schema.js";

async function test() {
  try {
        await db.insert(liveQueue).values({
          id: "123",
          clinicId: "PID-0002",
          token: "A-002",
          fullName: "Test",
          phone: "1234567890",
          age: 25,
          gender: "Male",
          priority: "Normal",
          visitType: "New",
          status: "Waiting",
          checkInTime: new Date(1788812950739),
          completedTime: null
        });
        await db.insert(patientRegistry).values({
            clinicId: "PID-0002",
            fullName: "Test",
            phone: "1234567890",
            age: 25,
            gender: "Male",
            firstVisit: new Date(1788812950739),
            lastVisited: new Date(1788812950739),
            followUpDate: null
        });
        console.log("Success");
  } catch(e) {
    console.error(e);
  }
}
test();
