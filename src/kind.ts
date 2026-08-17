import { Schema } from "effect"

/** Classified file kind. Dispatch key only, never a verdict. */
export const Kind = Schema.Literal(
  "text",
  "raster",
  "svg",
  "html",
  "md",
  "docx",
  "odt",
  "pdf",
  "binary"
)

export type Kind = typeof Kind.Type
