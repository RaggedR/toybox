import { assert } from "jsr:@std/assert";
import { DESIGNS } from "../shared/mod.ts";

// The contract with the sibling repo RaggedR/toybox-templates: every template
// it ships must reference a card design we actually support. If that repo adds
// a template using a design we've dropped (or renamed), this test goes red on
// the nightly run — so we find out before a recipient opens a mangled card.
//
// The nightly workflow checks that repo out at a pinned commit into _templates/.
const validDesigns = new Set<string>(DESIGNS.map((d) => d.id));

const templates = JSON.parse(
  await Deno.readTextFile(new URL("../_templates/templates.json", import.meta.url)),
) as Array<{ id: string; design: string }>;

Deno.test("every shipped template references a real design", () => {
  assert(templates.length > 0, "no templates found");
  for (const t of templates) {
    assert(
      validDesigns.has(t.design),
      `template '${t.id}' uses unknown design '${t.design}'`,
    );
  }
});
