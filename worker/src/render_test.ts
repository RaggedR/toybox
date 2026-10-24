import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { decodeBase64 } from "jsr:@std/encoding/base64";
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

Deno.test("render draws the message, not a blank card", () => {
  const pngBytes = (url: string) => {
    assertStringIncludes(url, "data:image/png;base64,");
    return decodeBase64(url.split(",")[1]).byteLength;
  };
  // A card with an empty message is just the gradient background. If the fonts
  // resvg needs are missing, the text is silently dropped and a card with a
  // message renders byte-for-byte like the empty one. Requiring the message card
  // to be meaningfully larger turns that silent failure into a red test -- on a
  // machine (or CI runner) without fonts, this is the assertion that fails.
  const withText = pngBytes(render("ocean", "Thinking of you."));
  const blank = pngBytes(render("ocean", ""));
  assert(
    withText > blank + 2000,
    `card with text (${withText}B) is not meaningfully larger than an empty one ` +
      `(${blank}B): the text did not render -- are the fonts installed?`,
  );
});
