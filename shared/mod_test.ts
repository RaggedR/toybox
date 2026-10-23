import { assertEquals } from "jsr:@std/assert";
import { CardInput, designById, DESIGNS } from "./mod.ts";

Deno.test("designById finds every real design and rejects unknown ones", () => {
  for (const d of DESIGNS) {
    assertEquals(designById(d.id)?.id, d.id);
  }
  assertEquals(designById("not-a-design"), undefined);
});

Deno.test("CardInput accepts a valid card", () => {
  const r = CardInput.safeParse({ design: "sunset", message: "Happy birthday!" });
  assertEquals(r.success, true);
});

Deno.test("CardInput rejects an unknown design", () => {
  const r = CardInput.safeParse({ design: "chartreuse", message: "hi" });
  assertEquals(r.success, false);
});

Deno.test("CardInput rejects an empty message", () => {
  const r = CardInput.safeParse({ design: "ocean", message: "   " });
  assertEquals(r.success, false);
});

Deno.test("CardInput rejects an over-long message", () => {
  const r = CardInput.safeParse({ design: "ocean", message: "x".repeat(281) });
  assertEquals(r.success, false);
});
