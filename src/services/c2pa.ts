import { Effect } from "effect"
import { DecodeError } from "../fail.js"
import { inspectRasterBytes, stripRasterBytes } from "../formats/raster.js"
import { inspectSvgText, stripSvgMeta } from "../formats/svg.js"
import { decodeUtf8 } from "../formats/text.js"
import type { Kind } from "../kind.js"
import { Finding } from "../report.js"

export interface C2paInspectResult {
  readonly present: boolean
  readonly applicable: boolean
  readonly findings: ReadonlyArray<Finding>
  readonly labels: ReadonlyArray<string>
}

export interface C2paStripResult {
  readonly bytes: Uint8Array
  readonly removed: boolean
  readonly applicable: boolean
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
      kind: Kind,
      path: string
    ): Effect.Effect<C2paInspectResult, DecodeError> =>
      Effect.gen(function* () {
        if (kind === "svg") {
          const text = yield* decodeUtf8(path, bytes, false)
          const parsed = inspectSvgText(text)
          return {
            present: parsed.present,
            applicable: true,
            findings: [
              new Finding({
                channel: "c2pa",
                status: parsed.present ? "present" : "absent"
              })
            ],
            labels: parsed.labels
          }
        }
        const parsed = inspectRasterBytes(bytes)
        if (!parsed.ok) {
          return yield* new DecodeError({ path, reason: parsed.reason })
        }
        return {
          present: parsed.present,
          applicable: parsed.applicable,
          findings: [
            new Finding({
              channel: "c2pa",
              status: parsed.applicable
                ? parsed.present
                  ? "present"
                  : "absent"
                : "degraded"
            })
          ],
          labels: parsed.labels
        }
      }),
    strip: (
      bytes: Uint8Array,
      kind: Kind,
      path: string
    ): Effect.Effect<C2paStripResult, DecodeError> =>
      Effect.gen(function* () {
        if (kind === "svg") {
          const text = yield* decodeUtf8(path, bytes, false)
          const stripped = stripSvgMeta(text)
          return {
            bytes: new TextEncoder().encode(stripped.text),
            removed: stripped.labels.length > 0,
            applicable: true,
            labels: stripped.labels
          }
        }
        const parsed = stripRasterBytes(bytes)
        if (!parsed.ok) {
          return yield* new DecodeError({ path, reason: parsed.reason })
        }
        return {
          bytes: parsed.bytes,
          removed: parsed.removed,
          applicable: parsed.applicable,
          labels: parsed.labels
        }
      })
  }
}) {}
