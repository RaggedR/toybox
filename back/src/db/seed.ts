import { pool } from "../db.ts";

// Drop in a handful of sample cards so there is something to look at. They
// start as 'pending'; the worker renders them a moment after it starts.
const samples = [
  { design: "sunset", message: "Happy birthday, Grandpa Rick!" },
  { design: "ocean", message: "Thinking of you." },
  { design: "forest", message: "Congratulations on the new job." },
];

const client = await pool.connect();
try {
  await client.queryObject`TRUNCATE cards`;
  for (const s of samples) {
    await client.queryObject`INSERT INTO cards (design, message) VALUES (${s.design}, ${s.message})`;
  }
  console.log(`seed: inserted ${samples.length} sample cards`);
} finally {
  client.release();
  await pool.end();
}
