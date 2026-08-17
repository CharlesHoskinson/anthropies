import { Effect } from "effect"
import { DecodeError } from "../fail.js"
import { inspectRasterBytes, stripRasterBytes } from "../formats/raster.js"
import type { Kind } from "../kind.js"
import { Finding } from "../report.js"

export interface C2paInspectResult {
  readonly present: boolean
  readonly findings: ReadonlyArray<Finding>
  readonly labels: ReadonlyArray<string>
}

export interface C2paStripResult {
  readonly bytes: Uint8Array
  readonly removed: boolean
  readonly labels: ReadonlyArray<string>
}

/** Parse c2patool stdout. Missing-claim lines are not a manifest. */
export const hasManifestFromToolOutput = (stdout: string): boolean =>
  !/No claim found|No JUMBF data found/i.test(stdout)

/** Hard-bound C2PA inspect and strip. Stdlib parse; c2patool is optional. */
export class C2pa extends Effect.Service<C2pa>()("C2pa", {
  accessors: true,
  succeed: {
    inspect: (
      bytes: Uint8Array,
      _kind: Kind,
      path: string
    ): Effect.Effect<C2paInspectResult, DecodeError> =>
      Effect.gen(function* () {
        const parsed = inspectRasterBytes(bytes)
        if (!parsed.ok) {
          return yield* new DecodeError({ path, reason: parsed.reason })
        }
        return {
          present: parsed.present,
          findings: [
            new Finding({
              channel: "c2pa",
              status: parsed.present ? "present" : "absent"
            })
          ],
          labels: parsed.labels
        }
      }),
    strip: (
      bytes: Uint8Array,
      _kind: Kind,
      path: string
    ): Effect.Effect<C2paStripResult, DecodeError> =>
      Effect.gen(function* () {
        const parsed = stripRasterBytes(bytes)
        if (!parsed.ok) {
          return yield* new DecodeError({ path, reason: parsed.reason })
        }
        return {
          bytes: parsed.bytes,
          removed: parsed.removed,
          labels: parsed.labels
        }
      })
  }
}) {}
