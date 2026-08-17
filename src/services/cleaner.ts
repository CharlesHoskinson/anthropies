import { Effect } from "effect"
import { BinaryInput, DecodeError } from "../fail.js"
import { cleanDocx, inspectDocx } from "../formats/docx.js"
import { cleanHtmlText, inspectHtmlText } from "../formats/html.js"
import { cleanMdText, inspectMdText } from "../formats/md.js"
import { cleanOdt, inspectOdt } from "../formats/odt.js"
import { PdfTools } from "../formats/pdf.js"
import { handlerFor, loadOwned } from "../formats/registry.js"
import { applyLayerA, type LayerARemoved } from "../layer-a.js"
import { softBindingSentence, type Report } from "../report.js"
import { C2pa } from "./c2pa.js"
import { destinationOf, makeContainerReport, makeRasterReport, makeTextReport, Reporter } from "./reporter.js"

export interface CleanOptions {
  readonly forceText: boolean
  readonly json: boolean
  readonly inPlace: boolean
  readonly output?: string
}

export interface CleanResult {
  readonly report: Report
  readonly bytes: Uint8Array
}

const layerPresent = (removed: LayerARemoved): boolean =>
  removed.unicode + removed.trailer + removed.banner > 0

/** Format clean plus Layer A on text-bearing kinds. */
export class Cleaner extends Effect.Service<Cleaner>()("Cleaner", {
  accessors: true,
  effect: Effect.gen(function* () {
    const reporter = yield* Reporter
    const c2pa = yield* C2pa
    const pdf = yield* PdfTools
    return {
      clean: (
        path: string,
        options: CleanOptions
      ) =>
        Effect.gen(function* () {
          const dest = destinationOf(path, options)
          const owned = yield* loadOwned(path)
          if (owned.kind === "raster" && !options.forceText) {
            const stripped = yield* c2pa.strip(owned.bytes, owned.kind, path)
            const after = yield* c2pa.inspect(stripped.bytes, owned.kind, path)
            const report = makeRasterReport({
              present: after.present,
              removed: stripped.removed,
              labels: stripped.labels,
              applicable: stripped.applicable
            })
            yield* reporter.writeAtomic(dest, stripped.bytes)
            return { report, bytes: stripped.bytes }
          }
          if (owned.kind === "svg" && !options.forceText) {
            const stripped = yield* c2pa.strip(owned.bytes, owned.kind, path)
            const text = new TextDecoder("utf-8", { fatal: false }).decode(stripped.bytes)
            const layered = applyLayerA(text)
            const bytes = new TextEncoder().encode(layered.text)
            const after = yield* c2pa.inspect(bytes, owned.kind, path)
            const residual = applyLayerA(layered.text).removed
            const report = makeContainerReport({
              kind: "svg",
              presentDeterministic: layerPresent(residual),
              presentC2pa: after.present,
              removed: layered.removed,
              c2paLabels: stripped.labels,
              c2paHonesty: stripped.removed ? "removed" : after.present ? "present" : "absent",
              degraded: false,
              extraHonesty: [softBindingSentence]
            })
            yield* reporter.writeAtomic(dest, bytes)
            return { report, bytes }
          }
          if ((owned.kind === "html" || owned.kind === "md") && !options.forceText) {
            const handler = handlerFor(owned.kind, false)
            if (handler === undefined) {
              return yield* new BinaryInput({ path, reason: `classified as ${owned.kind}` })
            }
            const text = yield* handler.decode(path, owned.bytes, false)
            const cleaned = owned.kind === "html" ? cleanHtmlText(text) : cleanMdText(text)
            const residual = applyLayerA(cleaned.text).removed
            const meta =
              owned.kind === "html" ? inspectHtmlText(cleaned.text) : inspectMdText(cleaned.text)
            const report = makeContainerReport({
              kind: owned.kind,
              presentDeterministic: layerPresent(residual),
              presentC2pa: meta.present,
              removed: cleaned.removed,
              c2paLabels: cleaned.labels,
              c2paHonesty: cleaned.labels.length > 0 ? "removed" : meta.present ? "present" : "absent",
              degraded: false
            })
            yield* reporter.writeAtomic(dest, cleaned.bytes)
            return { report, bytes: cleaned.bytes }
          }
          if (owned.kind === "docx" && !options.forceText) {
            const cleaned = cleanDocx(owned.bytes, path)
            if (!cleaned.ok) {
              return yield* new DecodeError({ path, reason: cleaned.reason })
            }
            const after = inspectDocx(cleaned.bytes, path)
            if (!after.ok) {
              return yield* new DecodeError({ path, reason: after.reason })
            }
            const report = makeContainerReport({
              kind: "docx",
              presentDeterministic: layerPresent(after.layer),
              presentC2pa: after.present,
              removed: cleaned.removed,
              c2paLabels: cleaned.labels,
              c2paHonesty: cleaned.labels.length > 0 ? "removed" : after.present ? "present" : "absent",
              degraded: false
            })
            yield* reporter.writeAtomic(dest, cleaned.bytes)
            return { report, bytes: cleaned.bytes }
          }
          if (owned.kind === "odt" && !options.forceText) {
            const cleaned = cleanOdt(owned.bytes, path)
            if (!cleaned.ok) {
              return yield* new DecodeError({ path, reason: cleaned.reason })
            }
            const after = inspectOdt(cleaned.bytes, path)
            if (!after.ok) {
              return yield* new DecodeError({ path, reason: after.reason })
            }
            const report = makeContainerReport({
              kind: "odt",
              presentDeterministic: layerPresent(after.layer),
              presentC2pa: after.present,
              removed: cleaned.removed,
              c2paLabels: cleaned.labels,
              c2paHonesty: cleaned.labels.length > 0 ? "removed" : after.present ? "present" : "absent",
              degraded: false
            })
            yield* reporter.writeAtomic(dest, cleaned.bytes)
            return { report, bytes: cleaned.bytes }
          }
          if (owned.kind === "pdf" && !options.forceText) {
            const stripped = yield* pdf.strip(owned.bytes, path)
            const after = yield* pdf.inspect(stripped.bytes)
            const report = makeContainerReport({
              kind: "pdf",
              presentDeterministic: false,
              presentC2pa: after.present,
              removed: { unicode: 0, trailer: 0, banner: 0 },
              c2paLabels: stripped.labels,
              c2paHonesty: stripped.degraded
                ? after.present
                  ? "present"
                  : "absent"
                : stripped.removed
                  ? "removed"
                  : after.present
                    ? "present"
                    : "absent",
              degraded: stripped.degraded,
              extraHonesty: stripped.degraded
                ? ["warning: exiftool or qpdf missing; PDF metadata not stripped"]
                : [softBindingSentence]
            })
            yield* reporter.writeAtomic(dest, stripped.bytes)
            return { report, bytes: stripped.bytes }
          }
          const handler = handlerFor(owned.kind, options.forceText)
          if (handler === undefined) {
            return yield* new BinaryInput({
              path,
              reason: `classified as ${owned.kind}`
            })
          }
          const text = yield* handler.decode(path, owned.bytes, options.forceText)
          const cleaned = handler.clean(text)
          const residual = applyLayerA(cleaned.text).removed
          const present = residual.unicode + residual.trailer + residual.banner > 0
          const report = makeTextReport({
            kind: owned.kind,
            removed: cleaned.removed,
            present
          })
          yield* reporter.writeAtomic(dest, cleaned.bytes)
          return { report, bytes: cleaned.bytes }
        })
    }
  }),
  dependencies: [Reporter.Default, C2pa.Default, PdfTools.Default]
}) {}
