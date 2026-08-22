import { Command as ProcCommand } from "@effect/platform"
import { FileSystem } from "@effect/platform/FileSystem"
import { Effect } from "effect"
import { DecodeError } from "../fail.js"

export interface PdfInspectResult {
  readonly present: boolean
  readonly labels: ReadonlyArray<string>
  readonly degraded: boolean
}

export interface PdfStripResult {
  readonly bytes: Uint8Array
  readonly removed: boolean
  readonly labels: ReadonlyArray<string>
  readonly degraded: boolean
}

const XMP_RE = /<\?xpacket begin[\s\S]*?<\?xpacket end[^?]*\?>/giu
const MARK_RE = /c2pa|jumbf|digitalSourceType|trainedAlgorithmicMedia|SoftwareAgent/iu

/** Drop stream bodies so compressed page content cannot fake provenance markers. */
const withoutStreamBodies = (raw: string): string =>
  raw.replace(/stream\r?\n[\s\S]*?endstream/gu, "stream\nendstream")

/** Structure-aware scan: XMP packets (incl. /Metadata streams) plus non-stream dictionaries. */
export const inspectPdfBytes = (bytes: Uint8Array): { readonly present: boolean; readonly labels: ReadonlyArray<string> } => {
  const raw = new TextDecoder("latin1").decode(bytes)
  const labels: Array<string> = []

  for (const packet of raw.matchAll(XMP_RE)) {
    if (MARK_RE.test(packet[0]!)) {
      labels.push("pdf-xmp")
      break
    }
  }

  const dictionaries = withoutStreamBodies(raw)
  if (MARK_RE.test(dictionaries)) {
    labels.push("pdf-marker")
  }

  return { present: labels.length > 0, labels }
}

const toolPresent = (bin: string, flag: string) =>
  ProcCommand.exitCode(ProcCommand.make(bin, flag)).pipe(
    Effect.map((code) => Number(code) === 0),
    Effect.catchAll(() => Effect.succeed(false))
  )

const missingLabels = (exif: boolean, qpdf: boolean): Array<string> => {
  const labels: Array<string> = []
  if (!exif) {
    labels.push("missing:exiftool")
  }
  if (!qpdf) {
    labels.push("missing:qpdf")
  }
  return labels
}

/** Live PDF inspect/strip via ProcCommand.make (never shell). */
export class PdfTools extends Effect.Service<PdfTools>()("PdfTools", {
  accessors: true,
  succeed: {
    inspect: (bytes: Uint8Array) =>
      Effect.gen(function* () {
        const scanned = inspectPdfBytes(bytes)
        const exif = yield* toolPresent("exiftool", "-ver")
        const qpdf = yield* toolPresent("qpdf", "--version")
        const missing = missingLabels(exif, qpdf)
        return {
          present: scanned.present,
          labels: [...scanned.labels, ...missing],
          degraded: missing.length > 0
        }
      }),
    strip: (bytes: Uint8Array, path: string) =>
      Effect.gen(function* () {
        const exif = yield* toolPresent("exiftool", "-ver")
        const qpdf = yield* toolPresent("qpdf", "--version")
        const missing = missingLabels(exif, qpdf)
        if (missing.length > 0) {
          return { bytes, removed: false, labels: missing, degraded: true }
        }
        const fs = yield* FileSystem
        const tmp = `${path}.anthropies-pdf-tmp`
        const lin = `${path}.anthropies-pdf-lin`
        yield* fs.writeFile(tmp, bytes).pipe(
          Effect.mapError((e) => new DecodeError({ path, reason: e.message }))
        )
        const exifRc = yield* ProcCommand.exitCode(
          ProcCommand.make("exiftool", "-all=", "-overwrite_original", tmp)
        ).pipe(Effect.mapError((e) => new DecodeError({ path, reason: e.message })))
        const qpdfRc = yield* ProcCommand.exitCode(
          ProcCommand.make("qpdf", "--linearize", "--", tmp, lin)
        ).pipe(Effect.mapError((e) => new DecodeError({ path, reason: e.message })))
        const ok = (Number(exifRc) === 0 || Number(exifRc) === 1) && (Number(qpdfRc) === 0 || Number(qpdfRc) === 3)
        const out = ok
          ? yield* fs.readFile(lin).pipe(
              Effect.mapError((e) => new DecodeError({ path, reason: e.message }))
            )
          : bytes
        yield* fs.remove(tmp).pipe(Effect.ignore)
        yield* fs.remove(lin).pipe(Effect.ignore)
        if (!ok) {
          return {
            bytes,
            removed: false,
            labels: ["exiftool-or-qpdf-failed"],
            degraded: true
          }
        }
        return { bytes: out, removed: true, labels: ["exiftool", "qpdf"], degraded: false }
      })
  }
}) {}
