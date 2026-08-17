import type { FileSystem } from "@effect/platform/FileSystem"
import { Effect } from "effect"
import { BinaryInput, type DecodeError, type InputTooLarge } from "../fail.js"
import { applyLayerA } from "../layer-a.js"
import { handlerFor, loadOwned } from "../formats/registry.js"
import type { Report } from "../report.js"
import { Detector } from "./detector.js"
import { makeTextReport } from "./reporter.js"

export interface InspectOptions {
  readonly forceText: boolean
  readonly json: boolean
}

/** Read, classify, and report. FileSystem only. */
export class Inspector extends Effect.Service<Inspector>()("Inspector", {
  accessors: true,
  effect: Effect.gen(function* () {
    const detector = yield* Detector
    return {
      inspect: (
        path: string,
        options: InspectOptions
      ): Effect.Effect<Report, BinaryInput | DecodeError | InputTooLarge, FileSystem> =>
        Effect.gen(function* () {
          const owned = yield* loadOwned(path)
          const handler = handlerFor(owned.kind, options.forceText)
          if (handler === undefined) {
            return yield* new BinaryInput({
              path,
              reason: `classified as ${owned.kind}`
            })
          }
          const text = yield* handler.decode(path, owned.bytes, options.forceText)
          const findings = detector.deterministic(text)
          const { removed } = applyLayerA(text)
          return makeTextReport({
            kind: owned.kind,
            removed,
            present: findings.some((f) => f.status === "present")
          })
        })
    }
  }),
  dependencies: [Detector.Default]
}) {}
