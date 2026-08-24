import { Command as ProcCommand } from "@effect/platform"
import { FileSystem } from "@effect/platform/FileSystem"
import { Effect, Option, Schema } from "effect"
import { join } from "node:path"
import { markllmDir, markllmRunner } from "../config.js"
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

/** Upstream pin: THU-BPM/MarkLLM (Apache-2.0). Operator supplies checkout via MARKLLM_DIR. */
export const MARKLLM_REPO = "THU-BPM/MarkLLM"
export const MARKLLM_PIN = "c45ddc40f7b761beabe55a1b8dc4690e531d1c6d"
export const APACHE_NOTICE =
  "Copyright The THU-BPM authors. Licensed under the Apache License, Version 2.0. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0"

const PACK_ID = "anthropies.markllm"
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
    markClass: "keyed-text",
    status: "indeterminate",
    evidence: new Evidence({
      kind: "empirical",
      ...(fingerprint !== undefined ? { versionFingerprint: fingerprint } : {})
    }),
    packId: PACK_ID,
    packImplementationVersion: PACK_VERSION
  })

export const markllmPack: CapabilityPack = {
  manifest: Schema.decodeUnknownSync(CapabilityManifest)({
    id: PACK_ID,
    displayName: "MarkLLM",
    kernelApiMin: "1.0.0",
    kernelApiMax: "1.0.0",
    apiVersion: "1.0.0",
    implementationVersion: PACK_VERSION,
    artifactKinds: ["text"],
    markClasses: ["keyed-text"],
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
    provenance: `Wraps ${MARKLLM_REPO} Apache-2.0 pin ${MARKLLM_PIN} via MARKLLM_DIR; Python not vendored under src/. ${APACHE_NOTICE}`
  }),

  probe: (_context: RunContext) =>
    Effect.gen(function* () {
      const dirOpt = yield* markllmDir
      if (Option.isNone(dirOpt) || dirOpt.value.trim() === "") {
        return new Availability({
          status: "unavailable",
          reason: "env-unset",
          detail: "MARKLLM_DIR"
        })
      }
      const runner = yield* markllmRunner
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
      if (yield* pinMismatch(dirOpt.value, MARKLLM_PIN)) {
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
      const dirOpt = yield* markllmDir
      if (Option.isNone(dirOpt) || dirOpt.value.trim() === "") {
        return [indeterminateFinding()]
      }
      const runner = yield* markllmRunner
      const script = entryScript(dirOpt.value, runner)
      const text = new TextDecoder("utf-8").decode(artifact.bytes)
      const stdout = yield* ProcCommand.string(
        ProcCommand.make(runner, script, "--pin", MARKLLM_PIN).pipe(ProcCommand.feed(text))
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
          markClass: "keyed-text",
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
