import { assert, assertEquals } from "jsr:@std/assert";
import { app } from "./app.ts";
import { pool } from "./db.ts";

// These tests need a real Postgres (DATABASE_URL). CI gives the `back` job a
// throwaway Postgres service container; locally you can point DATABASE_URL at
// any scratch database. We drive the Hono app in-process with app.request(),
// so no port is ever bound.

async function resetSchema() {
  const client = await pool.connect();
  try {
    await client.queryObject`
      CREATE TABLE IF NOT EXISTS cards (
        id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        design     text NOT NULL,
        message    text NOT NULL,
        image      text,
        status     text NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `;
    await client.queryObject`TRUNCATE cards`;
  } finally {
    client.release();
  }
}

Deno.test({
  name: "back API: health, create, fetch, validation, not-found",
  // The pool holds lazy connections for the length of the test; we close it in
  // the final step, so the default resource sanitizer would otherwise complain.
  sanitizeResources: false,
  sanitizeOps: false,
  async fn(t) {
    await resetSchema();

    await t.step("GET /health returns ok", async () => {
      const res = await app.request("/health");
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "ok");
    });

    let createdId = "";
    await t.step("POST /api/cards creates a card", async () => {
      const res = await app.request("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design: "sunset", message: "Happy birthday!" }),
      });
      assertEquals(res.status, 201);
      const body = await res.json();
      assert(typeof body.id === "string" && body.id.length > 0);
      assertEquals(body.url, `/card/${body.id}`);
      createdId = body.id;
    });

    await t.step("GET /api/cards/:id returns the pending card", async () => {
      const res = await app.request(`/api/cards/${createdId}`);
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.id, createdId);
      assertEquals(body.design, "sunset");
      assertEquals(body.message, "Happy birthday!");
      assertEquals(body.status, "pending");
      assertEquals(body.image, null);
    });

    await t.step("POST /api/cards rejects an unknown design with 400", async () => {
      const res = await app.request("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design: "chartreuse", message: "hi" }),
      });
      assertEquals(res.status, 400);
    });

    await t.step("GET /api/cards/:id is 404 for an unknown id", async () => {
      const res = await app.request("/api/cards/00000000-0000-0000-0000-000000000000");
      assertEquals(res.status, 404);
    });

    await t.step("close the pool", async () => {
      await pool.end();
    });
  },
});
