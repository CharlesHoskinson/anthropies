import type { FileSystem } from "@effect/platform/FileSystem"
import { Effect } from "effect"
import { BinaryInput, type DecodeError, type InputTooLarge, type WriteGuard } from "../fail.js"
import { applyLayerA } from "../layer-a.js"
import { handlerFor, loadOwned } from "../formats/registry.js"
import type { Report } from "../report.js"
import { destinationOf, makeTextReport, Reporter } from "./reporter.js"

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

/** Format clean plus Layer A on text. FileSystem only. */
export class Cleaner extends Effect.Service<Cleaner>()("Cleaner", {
  accessors: true,
  effect: Effect.gen(function* () {
    const reporter = yield* Reporter
    return {
      clean: (
        path: string,
        options: CleanOptions
      ): Effect.Effect<
        CleanResult,
        BinaryInput | DecodeError | InputTooLarge | WriteGuard,
        FileSystem
      > =>
        Effect.gen(function* () {
          const dest = destinationOf(path, options)
          const owned = yield* loadOwned(path)
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
  dependencies: [Reporter.Default]
}) {}
