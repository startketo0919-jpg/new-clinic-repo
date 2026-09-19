import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  dialect: "mysql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    host: process.env.MYSQL_HOST || process.env.SQL_HOST || "127.0.0.1",
    user: process.env.MYSQL_USER || process.env.SQL_USER || "u670657683_clinic_user",
    password: process.env.MYSQL_PASSWORD || process.env.SQL_PASSWORD || "Suyash@0919",
    database: process.env.MYSQL_DATABASE || process.env.SQL_DB_NAME || "u670657683_clinic_app",
  },
});
