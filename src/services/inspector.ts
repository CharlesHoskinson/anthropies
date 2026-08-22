import { Effect } from "effect"
import { RunContext } from "../core/capability.js"
import { makeArtifact } from "../core/domain.js"
import { builtinRegistry } from "../core/builtin-registry.js"
import { inspectArtifact } from "../core/pipeline.js"
import { BinaryInput, DecodeError } from "../fail.js"
import { inspectDocx } from "../formats/docx.js"
import { inspectHtmlText } from "../formats/html.js"
import { inspectMdText } from "../formats/md.js"
import { inspectOdt } from "../formats/odt.js"
import { PdfTools } from "../formats/pdf.js"
import { handlerFor, loadOwned } from "../formats/registry.js"
import { applyLayerA, type LayerARemoved } from "../layer-a.js"
import { softBindingSentence } from "../report.js"
import { C2pa } from "./c2pa.js"
import { makeContainerReport, makeRasterReport, makeTextReport } from "./reporter.js"

export interface InspectOptions {
  readonly forceText: boolean
  readonly json: boolean
}

const layerPresent = (removed: LayerARemoved): boolean =>
  removed.unicode + removed.trailer + removed.banner > 0

const inspectContext = (options: InspectOptions): RunContext =>
  new RunContext({
    operation: "inspect",
    forceText: options.forceText,
    json: options.json,
    requireCapability: [],
    kernelApiVersion: "1.0.0"
  })

/** Read, classify, and report. FileSystem plus optional PDF tools. */
export class Inspector extends Effect.Service<Inspector>()("Inspector", {
  accessors: true,
  effect: Effect.gen(function* () {
    const c2pa = yield* C2pa
    const pdf = yield* PdfTools
    const registry = builtinRegistry()
    return {
      inspect: (
        path: string,
        options: InspectOptions
      ) =>
        Effect.gen(function* () {
          const owned = yield* loadOwned(path)
          if (owned.kind === "raster" && !options.forceText) {
            const inspected = yield* c2pa.inspect(owned.bytes, owned.kind, path)
            return makeRasterReport({
              present: inspected.present,
              removed: false,
              labels: inspected.labels,
              applicable: inspected.applicable
            })
          }
          if (owned.kind === "svg" && !options.forceText) {
            const inspected = yield* c2pa.inspect(owned.bytes, owned.kind, path)
            const handler = handlerFor("svg", false)
            if (handler === undefined) {
              return yield* new BinaryInput({ path, reason: "classified as svg" })
            }
            const text = yield* handler.decode(path, owned.bytes, false)
            const { removed } = applyLayerA(text)
            return makeContainerReport({
              kind: "svg",
              presentDeterministic: layerPresent(removed),
              presentC2pa: inspected.present,
              removed,
              c2paLabels: inspected.labels,
              c2paHonesty: inspected.present ? "present" : "absent",
              degraded: false,
              extraHonesty: [softBindingSentence]
            })
          }
          if (owned.kind === "html" && !options.forceText) {
            const handler = handlerFor("html", false)
            if (handler === undefined) {
              return yield* new BinaryInput({ path, reason: "classified as html" })
            }
            const text = yield* handler.decode(path, owned.bytes, false)
            const meta = inspectHtmlText(text)
            const { removed } = applyLayerA(text)
            return makeContainerReport({
              kind: "html",
              presentDeterministic: layerPresent(removed),
              presentC2pa: meta.present,
              removed,
              c2paLabels: meta.labels,
              c2paHonesty: meta.present ? "present" : "absent",
              degraded: false
            })
          }
          if (owned.kind === "md" && !options.forceText) {
            const handler = handlerFor("md", false)
            if (handler === undefined) {
              return yield* new BinaryInput({ path, reason: "classified as md" })
            }
            const text = yield* handler.decode(path, owned.bytes, false)
            const meta = inspectMdText(text)
            const { removed } = applyLayerA(text)
            return makeContainerReport({
              kind: "md",
              presentDeterministic: layerPresent(removed),
              presentC2pa: meta.present,
              removed,
              c2paLabels: meta.labels,
              c2paHonesty: meta.present ? "present" : "absent",
              degraded: false
            })
          }
          if (owned.kind === "docx" && !options.forceText) {
            const inspected = inspectDocx(owned.bytes, path)
            if (!inspected.ok) {
              return yield* new DecodeError({ path, reason: inspected.reason })
            }
            return makeContainerReport({
              kind: "docx",
              presentDeterministic: layerPresent(inspected.layer),
              presentC2pa: inspected.present,
              removed: inspected.layer,
              c2paLabels: inspected.labels,
              c2paHonesty: inspected.present ? "present" : "absent",
              degraded: false
            })
          }
          if (owned.kind === "odt" && !options.forceText) {
            const inspected = inspectOdt(owned.bytes, path)
            if (!inspected.ok) {
              return yield* new DecodeError({ path, reason: inspected.reason })
            }
            return makeContainerReport({
              kind: "odt",
              presentDeterministic: layerPresent(inspected.layer),
              presentC2pa: inspected.present,
              removed: inspected.layer,
              c2paLabels: inspected.labels,
              c2paHonesty: inspected.present ? "present" : "absent",
              degraded: false
            })
          }
          if (owned.kind === "pdf" && !options.forceText) {
            const inspected = yield* pdf.inspect(owned.bytes)
            return makeContainerReport({
              kind: "pdf",
              presentDeterministic: false,
              presentC2pa: inspected.present,
              removed: { unicode: 0, trailer: 0, banner: 0 },
              c2paLabels: inspected.labels,
              c2paHonesty: inspected.present ? "present" : "absent",
              degraded: inspected.degraded,
              extraHonesty: inspected.degraded
                ? ["warning: exiftool or qpdf missing; PDF metadata not stripped"]
                : [softBindingSentence]
            })
          }
          const handler = handlerFor(owned.kind, options.forceText)
          if (handler === undefined) {
            return yield* new BinaryInput({
              path,
              reason: `classified as ${owned.kind}`
            })
          }
          const text = yield* handler.decode(path, owned.bytes, options.forceText)
          const artifact = makeArtifact(new TextEncoder().encode(text), "text", {
            name: path,
            ...(owned.suffix !== undefined ? { suffix: owned.suffix } : {})
          })
          const findings = yield* inspectArtifact(registry, artifact, inspectContext(options)).pipe(
            Effect.mapError(
              (failure) =>
                new DecodeError({
                  path,
                  reason: failure.diagnostics ?? `${failure.code}:${failure.reason}`
                })
            )
          )
          const { removed } = applyLayerA(text)
          return makeTextReport({
            kind: owned.kind,
            removed,
            present: findings.some(
              (finding) => finding.channel === "deterministic" && finding.status === "present"
            )
          })
        })
    }
  }),
  dependencies: [C2pa.Default, PdfTools.Default]
}) {}
