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

const ascii = (bytes: Uint8Array, start: number, end: number): string =>
  String.fromCharCode(...bytes.subarray(start, end))

const startsWithBytes = (bytes: Uint8Array, magic: ReadonlyArray<number>): boolean => {
  if (bytes.length < magic.length) {
    return false
  }
  return magic.every((b, i) => bytes[i] === b)
}

const looksBinary = (bytes: Uint8Array): boolean => {
  const n = Math.min(bytes.length, 8192)
  if (n === 0) {
    return false
  }
  let control = 0
  for (let i = 0; i < n; i++) {
    const b = bytes[i] ?? 0
    if (b === 0) {
      return true
    }
    if (b < 0x09 || (b > 0x0d && b < 0x20)) {
      control += 1
    }
  }
  return control / n > 0.3
}

const ftypBrand = (bytes: Uint8Array): string | undefined => {
  if (bytes.length < 12) {
    return undefined
  }
  if (ascii(bytes, 4, 8) !== "ftyp") {
    return undefined
  }
  return ascii(bytes, 8, 12)
}

const suffixOf = (suffix: string | undefined): string | undefined => {
  if (suffix === undefined || suffix.length === 0) {
    return undefined
  }
  return suffix.startsWith(".") ? suffix.toLowerCase() : `.${suffix.toLowerCase()}`
}

/** Magic bytes beat suffixes. Unknown non-text magics are binary. */
export const classify = (bytes: Uint8Array, suffix?: string): Kind => {
  const ext = suffixOf(suffix)
  if (startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47])) {
    return "raster"
  }
  if (startsWithBytes(bytes, [0xff, 0xd8, 0xff])) {
    return "raster"
  }
  if (startsWithBytes(bytes, [0x47, 0x49, 0x46, 0x38])) {
    return "raster"
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") {
    return "raster"
  }
  const brand = ftypBrand(bytes)
  if (brand === "avif" || brand === "avis" || brand === "heic" || brand === "heif" || brand === "mif1") {
    return "raster"
  }
  if (startsWithBytes(bytes, [0x25, 0x50, 0x44, 0x46])) {
    return "pdf"
  }
  if (startsWithBytes(bytes, [0x50, 0x4b])) {
    if (ext === ".docx") {
      return "docx"
    }
    if (ext === ".odt") {
      return "odt"
    }
    return "binary"
  }
  if (looksBinary(bytes)) {
    return "binary"
  }
  if (ext === ".md") {
    return "md"
  }
  if (ext === ".html" || ext === ".htm") {
    return "html"
  }
  if (ext === ".svg") {
    return "svg"
  }
  return "text"
}

