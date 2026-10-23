import { Pool } from "@db/postgres";
import { render } from "./render.ts";

const connectionString = Deno.env.get("DATABASE_URL");
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}
const pool = new Pool(connectionString, 2, true);

// Claim one pending card and render it. FOR UPDATE SKIP LOCKED means several
// workers could run side by side without ever rendering the same card twice.
async function tick(): Promise<void> {
  const client = await pool.connect();
  const tx = client.createTransaction("render_card");
  try {
    await tx.begin();
    const r = await tx.queryObject<{ id: string; design: string; message: string }>`
      SELECT id, design, message FROM cards
      WHERE status = 'pending' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED
    `;
    if (r.rows.length === 0) {
      await tx.commit();
      return;
    }
    const card = r.rows[0];
    const image = render(card.design, card.message);
    await tx.queryObject`UPDATE cards SET image = ${image}, status = 'rendered' WHERE id = ${card.id}`;
    await tx.commit();
    console.log(`worker: rendered card ${card.id}`);
  } catch (err) {
    try {
      await tx.rollback();
    } catch { /* ignore */ }
    console.error("worker: render failed:", err);
  } finally {
    client.release();
  }
}

console.log("worker: watching for pending cards...");
setInterval(() => {
  void tick();
}, 1000);
