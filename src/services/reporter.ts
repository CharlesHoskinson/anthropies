import { FileSystem } from "@effect/platform/FileSystem"
import { randomUUID } from "node:crypto"
import { Console, Effect, Schema } from "effect"
import { WriteGuard } from "../fail.js"
import type { Kind } from "../kind.js"
import type { LayerARemoved } from "../layer-a.js"
import {
  Finding,
  honestyStanza,
  OfficialUnavailable,
  Removed,
  Report,
  softBindingSentence
} from "../report.js"

export interface DestOptions {
  readonly inPlace: boolean
  readonly output?: string
}

/** Resolve -o, else --in-place, else path + ".cleaned". */
export const destinationOf = (path: string, options: DestOptions): string =>
  options.output ?? (options.inPlace ? path : `${path}.cleaned`)

const countLine = (removed: LayerARemoved): string => {
  if (removed.unicode + removed.trailer + removed.banner === 0) {
    return "none"
  }
  return `unicode=${String(removed.unicode)} trailer=${String(removed.trailer)} banner=${String(removed.banner)}`
}

const removedLabels = (removed: LayerARemoved): Array<string> | undefined => {
  const labels: Array<string> = []
  if (removed.unicode > 0) {
    labels.push(`unicode:${String(removed.unicode)}`)
  }
  if (removed.trailer > 0) {
    labels.push(`trailer:${String(removed.trailer)}`)
  }
  if (removed.banner > 0) {
    labels.push(`banner:${String(removed.banner)}`)
  }
  return labels.length > 0 ? labels : undefined
}

/** Build a Family-1 Report. present drives inspect/clean residual exit. */
export const makeTextReport = (input: {
  readonly kind: Kind
  readonly removed: LayerARemoved
  readonly present: boolean
}): Report => {
  const labels = removedLabels(input.removed)
  const findings = [
    new Finding({
      channel: "deterministic",
      status: input.present ? "present" : "absent"
    }),
    new Finding({ channel: "c2pa", status: "unavailable" }),
    new Finding({ channel: "official", status: "unavailable" }),
    new Finding({ channel: "statistical", status: "unavailable" })
  ]
  const base = {
    kind: input.kind,
    findings,
    removed: new Removed(labels === undefined ? {} : { deterministic: labels }),
    degraded: false,
    honesty: honestyStanza({
      official: "unavailable (ANTHROPIC_DETECT_URL unset)",
      c2pa: "not-applicable",
      deterministic: countLine(input.removed),
      statistical: "not-run"
    }),
    official: new OfficialUnavailable()
  }
  return input.present
    ? new Report({ ...base, anyDeterministicHits: true })
    : new Report(base)
}

/** Build a raster Report. Soft-binding sentence is always present. */
export const makeRasterReport = (input: {
  readonly present: boolean
  readonly removed: boolean
  readonly labels: ReadonlyArray<string>
}): Report => {
  const c2paHonesty = input.removed ? "removed" : input.present ? "present" : "absent"
  const residual = input.removed
    ? `hard-bound C2PA/metadata removed; ${softBindingSentence}`
    : softBindingSentence
  return new Report({
    kind: "raster",
    findings: [
      new Finding({ channel: "deterministic", status: "absent" }),
      new Finding({
        channel: "c2pa",
        status: input.present ? "present" : "absent"
      }),
      new Finding({ channel: "official", status: "unavailable" }),
      new Finding({ channel: "statistical", status: "unavailable" })
    ],
    removed: new Removed(
      input.removed && input.labels.length > 0 ? { c2pa: [...input.labels] } : {}
    ),
    degraded: false,
    honesty: honestyStanza({
      official: "unavailable (ANTHROPIC_DETECT_URL unset)",
      c2pa: c2paHonesty,
      deterministic: "none",
      statistical: "not-run"
    }).concat(residual),
    official: new OfficialUnavailable()
  })
}

/** Schema encode, honesty stanza, and atomic write policy. */
export class Reporter extends Effect.Service<Reporter>()("Reporter", {
  accessors: true,
  succeed: {
    encode: (report: Report): unknown => Schema.encodeUnknownSync(Report)(report),
    print: (report: Report, json: boolean): Effect.Effect<void> =>
      Effect.gen(function* () {
        yield* Console.error(report.honesty.join("\n"))
        if (json) {
          yield* Console.log(JSON.stringify(Schema.encodeUnknownSync(Report)(report)))
        }
      }),
    writeAtomic: (dest: string, bytes: Uint8Array): Effect.Effect<void, WriteGuard, FileSystem> =>
      Effect.gen(function* () {
        const fs = yield* FileSystem
        const isLink = yield* fs.readLink(dest).pipe(
          Effect.as(true),
          Effect.catchAll(() => Effect.succeed(false))
        )
        if (isLink) {
          return yield* new WriteGuard({ path: dest, reason: "destination is a symlink" })
        }
        const tmp = `${dest}.tmp-${randomUUID()}`
        yield* fs.writeFile(tmp, bytes).pipe(
          Effect.mapError((e) => new WriteGuard({ path: dest, reason: e.message }))
        )
        yield* fs.rename(tmp, dest).pipe(
          Effect.mapError((e) => new WriteGuard({ path: dest, reason: e.message }))
        )
      })
  }
}) {}
