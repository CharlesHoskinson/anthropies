import { FileSystem } from "@effect/platform/FileSystem"
import { Effect } from "effect"
import { DecodeError, InputTooLarge } from "../fail.js"
import { classify, type Kind } from "../kind.js"
import { cleanHtmlText } from "./html.js"
import { cleanMdText } from "./md.js"
import { cleanSvgText } from "./svg.js"
import { cleanText, decodeUtf8, type TextCleanResult } from "./text.js"

/** File cap from spec §12, checked from stat before a full buffer. */
export const fileCapBytes = 256 * 1024 * 1024

export interface FormatHandler {
  readonly kind: Kind
  readonly decode: (
    path: string,
    bytes: Uint8Array,
    forceText: boolean
  ) => Effect.Effect<string, DecodeError>
  readonly clean: (text: string) => TextCleanResult
}

export interface OwnedFile {
  readonly bytes: Uint8Array
  readonly kind: Kind
  readonly suffix: string | undefined
}

const textHandler: FormatHandler = {
  kind: "text",
  decode: decodeUtf8,
  clean: cleanText
}

const svgHandler: FormatHandler = {
  kind: "svg",
  decode: decodeUtf8,
  clean: (text) => {
    const cleaned = cleanSvgText(text)
    return { bytes: cleaned.bytes, text: cleaned.text, removed: cleaned.removed }
  }
}

const htmlHandler: FormatHandler = {
  kind: "html",
  decode: decodeUtf8,
  clean: (text) => {
    const cleaned = cleanHtmlText(text)
    return { bytes: cleaned.bytes, text: cleaned.text, removed: cleaned.removed }
  }
}

const mdHandler: FormatHandler = {
  kind: "md",
  decode: decodeUtf8,
  clean: (text) => {
    const cleaned = cleanMdText(text)
    return { bytes: cleaned.bytes, text: cleaned.text, removed: cleaned.removed }
  }
}

/** Extensible dispatch table. Families 1 and 3 register text-bearing kinds. */
export const formatHandlers: Partial<Record<Kind, FormatHandler>> = {
  text: textHandler,
  svg: svgHandler,
  html: htmlHandler,
  md: mdHandler
}

const byteKinds: ReadonlySet<Kind> = new Set([
  "raster",
  "docx",
  "odt",
  "xlsx",
  "pptx",
  "epub",
  "pdf"
])

/** Suffix from a path. Hidden files with no extension yield undefined. */
export const pathSuffix = (path: string): string | undefined => {
  const base = path.split(/[/\\]/).pop() ?? path
  const dot = base.lastIndexOf(".")
  if (dot <= 0) {
    return undefined
  }
  return base.slice(dot).toLowerCase()
}

/** Look up a handler. force-text falls back to the text handler. */
export const handlerFor = (kind: Kind, forceText: boolean): FormatHandler | undefined => {
  const found = formatHandlers[kind]
  if (found !== undefined) {
    return found
  }
  if (forceText) {
    return textHandler
  }
  return undefined
}

/** Byte families plus registered text handlers. */
export const handlesKind = (kind: Kind, forceText: boolean): boolean =>
  (byteKinds.has(kind) && !forceText) || handlerFor(kind, forceText) !== undefined

/** Stat, refuse over-cap, then classify. */
export const loadOwned = (path: string): Effect.Effect<OwnedFile, DecodeError | InputTooLarge, FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem
    const info = yield* fs.stat(path).pipe(
      Effect.mapError((e) => new DecodeError({ path, reason: e.message }))
    )
    if (Number(info.size) > fileCapBytes) {
      return yield* new InputTooLarge({ path, reason: `file exceeds ${String(fileCapBytes)} bytes` })
    }
    const bytes = yield* fs.readFile(path).pipe(
      Effect.mapError((e) => new DecodeError({ path, reason: e.message }))
    )
    const suffix = pathSuffix(path)
    return { bytes, kind: classify(bytes, suffix), suffix }
  })
