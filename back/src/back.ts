import { app } from "./app.ts";

// The entry point: take the app built in app.ts and actually serve it. Keeping
// the two apart means the tests can exercise `app` without a listening port.
const port = Number(Deno.env.get("PORT") ?? 3000);
Deno.serve(
  { port, hostname: Deno.env.get("HOST") ?? "0.0.0.0", onListen: () => console.log(`back: listening on port ${port}`) },
  app.fetch,
);
