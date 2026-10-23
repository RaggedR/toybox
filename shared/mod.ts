import { z } from "zod";

// The card designs the user can pick from. Both the frontend (to show
// swatches) and the worker (to render the image) read this one list, so the
// set of designs can never drift between the two.
export const DESIGNS = [
  { id: "sunset", name: "Sunset", from: "#ff9966", to: "#ff5e62" },
  { id: "ocean", name: "Ocean", from: "#2193b0", to: "#6dd5ed" },
  { id: "forest", name: "Forest", from: "#11998e", to: "#38ef7d" },
  { id: "berry", name: "Berry", from: "#8e2de2", to: "#4a00e0" },
] as const;

export type Design = (typeof DESIGNS)[number];

export const DesignId = z.enum(["sunset", "ocean", "forest", "berry"]);
export type DesignId = z.infer<typeof DesignId>;

export function designById(id: string): Design | undefined {
  return DESIGNS.find((d) => d.id === id);
}

// What the client sends to POST /api/cards. Validated on the server before
// anything touches the database.
export const CardInput = z.object({
  design: DesignId,
  message: z.string().trim().min(1, "message is required").max(280, "message too long (280 max)"),
});
export type CardInput = z.infer<typeof CardInput>;

// A full card row as the API returns it. `image` is null until the worker has
// rendered it; `status` flips from "pending" to "rendered" at the same moment.
export const Card = z.object({
  id: z.string(),
  design: DesignId,
  message: z.string(),
  image: z.string().nullable(),
  status: z.enum(["pending", "rendered"]),
  created_at: z.string(),
});
export type Card = z.infer<typeof Card>;
