import { Pool } from "@db/postgres";

// One lazy connection pool for the whole process. The address and credentials
// come from DATABASE_URL (read from the environment with Deno.env), never
// hard-coded, so the same code runs on a laptop and in the cloud.
const connectionString = Deno.env.get("DATABASE_URL");
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

export const pool = new Pool(connectionString, 5, true);
