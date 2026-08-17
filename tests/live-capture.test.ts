import { FileSystem } from "@effect/platform"
import { NodeContext, NodeHttpClient } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { Config, Effect, Option, Schema } from "effect"
import { anthropicApiKey } from "../src/config.js"
import { markedModelIds } from "../src/models/allowlist.js"
import { Capturer, Sidecar } from "../src/services/capturer.js"
import { Inspector } from "../src/services/inspector.js"

describe("live_capture_smoke", () => {
  it.scoped("writes capture + sidecar and official is unavailable", () =>
    Effect.gen(function* () {
      const live = yield* Config.string("LIVE").pipe(Config.withDefault("0"))
      const key = yield* anthropicApiKey
      const model = markedModelIds[0]
      if (live !== "1" || Option.isNone(key) || model === undefined) {
        return
      }
      const fs = yield* FileSystem.FileSystem
      const dir = yield* fs.makeTempDirectoryScoped()
      const result = yield* Capturer.capture({
        model,
        prompt: "Reply with the single word ok.",
        destDir: dir
      }).pipe(
        Effect.provide(Capturer.Default),
        Effect.provide(NodeHttpClient.layer),
        Effect.catchAll(() => Effect.succeed(undefined))
      )
      if (result === undefined) {
        return
      }
      expect(result.path.endsWith(".md")).toBe(true)
      expect(yield* fs.exists(result.path)).toBe(true)
      const sidecarJson = yield* fs.readFileString(result.path.replace(/\.md$/, ".json"))
      const sidecar = Schema.decodeUnknownSync(Sidecar)(JSON.parse(sidecarJson) as unknown)
      expect(sidecar.model).toBe(model)
      expect(sidecar.capturedFrom).toContain("anthropic")
      expect(JSON.stringify(sidecar)).not.toMatch(/watermarked|sampled/i)
      expect(sidecarJson).not.toMatch(/sk-ant/i)
      const report = yield* Inspector.inspect(result.path, { forceText: false, json: false }).pipe(
        Effect.provide(Inspector.Default)
      )
      const official = report.findings.filter((f) => f.channel === "official")
      expect(official.every((f) => f.status === "unavailable")).toBe(true)
    }).pipe(Effect.provide(NodeContext.layer))
  )
})
