import { Command as ProcCommand } from "@effect/platform"
import { FileSystem } from "@effect/platform/FileSystem"
import { Effect, Encoding, Option, Schema } from "effect"
import { join } from "node:path"
import { markDiffusionDir, markDiffusionRunner } from "../config.js"
import {
  CapabilityManifest,
  defaultNativeLimits,
  type CapabilityPack,
  type RunContext
} from "../core/capability.js"
import {
  Availability,
  Evidence,
  KernelFinding,
  type Artifact,
  type KernelFindingStatus
} from "../core/domain.js"

/** Upstream pin: THU-BPM/MarkDiffusion (Apache-2.0). Operator supplies checkout via MARKDIFFUSION_DIR. */
export const MARKDIFFUSION_REPO = "THU-BPM/MarkDiffusion"
export const MARKDIFFUSION_PIN = "9d81656d1a5f9e5194fc2f727bb795ef29e53809"
export const APACHE_NOTICE =
  "Copyright The THU-BPM authors. Licensed under the Apache License, Version 2.0. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0"

const PACK_ID = "anthropies.markdiffusion"
const PACK_VERSION = "0.1.0"
const PIN_FILE = ".anthropies-pin"

const DetectStdout = Schema.Struct({
  algorithm: Schema.String,
  configuration: Schema.String,
  status: Schema.Literal("present", "absent", "indeterminate")
})

const entryScript = (dir: string, runner: string): string =>
  join(dir, runner === "python3" ? "watermark_detect.py" : "watermark_detect.mjs")

const runnerPresent = (runner: string) =>
  ProcCommand.exitCode(ProcCommand.make(runner, "--version")).pipe(
    Effect.map((code) => Number(code) === 0),
    Effect.catchAll(() => Effect.succeed(false))
  )

const pinMismatch = (dir: string, expected: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem
    const path = join(dir, PIN_FILE)
    const exists = yield* fs.exists(path).pipe(Effect.catchAll(() => Effect.succeed(false)))
    if (!exists) {
      return false
    }
    const raw = yield* fs.readFileString(path).pipe(Effect.catchAll(() => Effect.succeed("")))
    return raw.trim() !== expected
  })

const decodeStatus = (status: string): KernelFindingStatus => {
  if (status === "present" || status === "absent" || status === "indeterminate") {
    return status
  }
  return "indeterminate"
}

const indeterminateFinding = (fingerprint?: string): KernelFinding =>
  new KernelFinding({
    channel: "statistical",
    markClass: "pixel",
    status: "indeterminate",
    evidence: new Evidence({
      kind: "empirical",
      ...(fingerprint !== undefined ? { versionFingerprint: fingerprint } : {})
    }),
    packId: PACK_ID,
    packImplementationVersion: PACK_VERSION
  })

export const markDiffusionPack: CapabilityPack = {
  manifest: Schema.decodeUnknownSync(CapabilityManifest)({
    id: PACK_ID,
    displayName: "MarkDiffusion",
    kernelApiMin: "1.0.0",
    kernelApiMax: "1.0.0",
    apiVersion: "1.0.0",
    implementationVersion: PACK_VERSION,
    artifactKinds: ["raster"],
    markClasses: ["pixel"],
    operations: ["inspect"],
    channel: "statistical",
    priority: 40,
    ordering: {},
    runtime: "local-process",
    network: "none",
    privacy: "local-only",
    limits: defaultNativeLimits,
    license: "apache-2.0",
    distribution: "optional",
    provenance: `Wraps ${MARKDIFFUSION_REPO} Apache-2.0 pin ${MARKDIFFUSION_PIN} via MARKDIFFUSION_DIR; Python not vendored under src/. ${APACHE_NOTICE}`
  }),

  probe: (_context: RunContext) =>
    Effect.gen(function* () {
      const dirOpt = yield* markDiffusionDir
      if (Option.isNone(dirOpt) || dirOpt.value.trim() === "") {
        return new Availability({
          status: "unavailable",
          reason: "env-unset",
          detail: "MARKDIFFUSION_DIR"
        })
      }
      const runner = yield* markDiffusionRunner
      if (runner === "python3") {
        const present = yield* runnerPresent(runner)
        if (!present) {
          return new Availability({
            status: "unavailable",
            reason: "tool-missing",
            detail: "python3"
          })
        }
      }
      if (yield* pinMismatch(dirOpt.value, MARKDIFFUSION_PIN)) {
        return new Availability({
          status: "unavailable",
          reason: "probe-failed",
          detail: PIN_FILE
        })
      }
      return new Availability({ status: "available", reason: "ready" })
    }) as Effect.Effect<Availability>,

  inspect: (artifact: Artifact, _context: RunContext) =>
    Effect.gen(function* () {
      const dirOpt = yield* markDiffusionDir
      if (Option.isNone(dirOpt) || dirOpt.value.trim() === "") {
        return [indeterminateFinding()]
      }
      const runner = yield* markDiffusionRunner
      const script = entryScript(dirOpt.value, runner)
      const text = Encoding.encodeBase64(artifact.bytes)
      const stdout = yield* ProcCommand.string(
        ProcCommand.make(runner, script, "--pin", MARKDIFFUSION_PIN).pipe(ProcCommand.feed(text))
      ).pipe(Effect.catchAll(() => Effect.succeed("")))
      const parsed = Schema.decodeUnknownOption(DetectStdout)(
        (() => {
          try {
            return JSON.parse(stdout) as unknown
          } catch {
            return null
          }
        })()
      )
      if (Option.isNone(parsed)) {
        return [indeterminateFinding()]
      }
      const { algorithm, configuration, status } = parsed.value
      return [
        new KernelFinding({
          channel: "statistical",
          markClass: "pixel",
          status: decodeStatus(status),
          evidence: new Evidence({
            kind: "empirical",
            versionFingerprint: `${algorithm}:config=${configuration}`
          }),
          packId: PACK_ID,
          packImplementationVersion: PACK_VERSION
        })
      ]
    }).pipe(
      Effect.catchAll(() => Effect.succeed([indeterminateFinding()]))
    ) as unknown as Effect.Effect<ReadonlyArray<KernelFinding>>
}
