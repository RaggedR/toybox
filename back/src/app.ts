import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { CardInput } from "@toybox/shared";
import { pool } from "./db.ts";

// The Hono app, built but not served. `back.ts` imports this and calls
// Deno.serve; the tests import it and drive it with `app.request(...)`, so the
// whole routing/validation/database path can be exercised in-process without
// ever binding a port.
export const app = new Hono();

// Smoke-check endpoint: "is this process actually serving?"
app.get("/health", (c) => c.text("ok"));

// Create a card. Validate the body with the shared schema, store it as
// 'pending', and hand back a shareable link. The worker renders the image a
// moment later, out of the user's way.
app.post("/api/cards", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = CardInput.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "invalid input" }, 400);
  }
  const { design, message } = parsed.data;
  const client = await pool.connect();
  try {
    const r = await client.queryObject<{ id: string }>`
      INSERT INTO cards (design, message) VALUES (${design}, ${message}) RETURNING id
    `;
    const id = r.rows[0].id;
    return c.json({ id, url: `/card/${id}` }, 201);
  } finally {
    client.release();
  }
});

// Fetch one card as JSON. The recipient's view page polls this until `image`
// is set (i.e. until the worker has rendered it).
app.get("/api/cards/:id", async (c) => {
  const client = await pool.connect();
  try {
    const r = await client.queryObject`
      SELECT id, design, message, image, status, created_at FROM cards WHERE id = ${c.req.param("id")}
    `;
    if (r.rows.length === 0) return c.json({ error: "card not found" }, 404);
    return c.json(r.rows[0]);
  } finally {
    client.release();
  }
});

// In production the backend also serves the built frontend (web/dist). In
// development vite serves it instead, so these only do anything once it exists.
app.use("/*", serveStatic({ root: "./web/dist" }));
app.get("*", async (c) => {
  try {
    return c.html(await Deno.readTextFile("./web/dist/index.html"));
  } catch {
    return c.text("frontend not built — run it via vite in dev", 404);
  }
});
