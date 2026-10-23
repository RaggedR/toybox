import { pool } from "../db.ts";

// Create the schema. Safe to run repeatedly: everything is "if not exists".
const client = await pool.connect();
try {
  await client.queryObject`
    CREATE TABLE IF NOT EXISTS cards (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      design     text NOT NULL,
      message    text NOT NULL,
      image      text,                               -- base64 data URL, null until rendered
      status     text NOT NULL DEFAULT 'pending',    -- 'pending' | 'rendered'
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `;
  console.log("migrate: cards table is ready");
} finally {
  client.release();
  await pool.end();
}
