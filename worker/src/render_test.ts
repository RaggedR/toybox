import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { buildSvg, escapeXml, render, wrap } from "./render.ts";

Deno.test("escapeXml neutralises markup so a message can't break the SVG", () => {
  assertEquals(escapeXml(`<script>&"'`), "&lt;script&gt;&amp;&quot;&apos;");
});

Deno.test("wrap splits long text and never exceeds six lines", () => {
  const lines = wrap("one two three four five six seven eight nine ten", 8);
  assert(lines.length <= 6);
  assertEquals(lines[0], "one two");
});

Deno.test("buildSvg uses the design's gradient colours", () => {
  const svg = buildSvg("sunset", "hello");
  assertStringIncludes(svg, "#ff9966"); // sunset `from`
  assertStringIncludes(svg, "#ff5e62"); // sunset `to`
  assertStringIncludes(svg, ">hello<");
});

Deno.test("buildSvg falls back to a dark gradient for an unknown design", () => {
  const svg = buildSvg("nope", "hi");
  assertStringIncludes(svg, "#333333");
});

Deno.test("render produces a PNG data URL", () => {
  const url = render("ocean", "Thinking of you.");
  assertStringIncludes(url, "data:image/png;base64,");
  assert(url.length > "data:image/png;base64,".length + 100);
});
