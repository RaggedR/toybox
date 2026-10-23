import { Resvg } from "@resvg/resvg-js";
import { encodeBase64 } from "jsr:@std/encoding/base64";
import { designById } from "@toybox/shared";

// The pure, database-free half of the worker: turning (design, message) into a
// PNG data URL. Kept in its own module so the tests can exercise it without a
// database, a transaction, or the polling loop.

export function escapeXml(s: string): string {
  const map: Record<string, string> = {
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  };
  return s.replace(/[<>&'"]/g, (c) => map[c]!);
}

// Naive word-wrap into at most 6 lines of roughly `maxChars` each.
export function wrap(message: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of message.split(/\s+/)) {
    const candidate = (line + " " + word).trim();
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 6);
}

export function buildSvg(design: string, message: string): string {
  const d = designById(design);
  const from = d?.from ?? "#333333";
  const to = d?.to ?? "#111111";
  const W = 800;
  const H = 500;
  const lineHeight = 54;
  const lines = wrap(message, 22);
  const startY = H / 2 - ((lines.length - 1) * lineHeight) / 2;

  const texts = lines
    .map(
      (ln, i) =>
        `<text x="${W / 2}" y="${startY + i * lineHeight}" font-family="Helvetica, Arial, sans-serif" ` +
        `font-size="42" font-weight="700" fill="#ffffff" text-anchor="middle" ` +
        `dominant-baseline="middle">${escapeXml(ln)}</text>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${from}"/>
        <stop offset="100%" stop-color="${to}"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    ${texts}
  </svg>`;
}

// The slow job: draw the message onto its design and return a PNG as a base64
// data URL. We build an SVG and let resvg rasterise it to PNG.
export function render(design: string, message: string): string {
  const png = new Resvg(buildSvg(design, message)).render().asPng();
  return `data:image/png;base64,${encodeBase64(png)}`;
}
