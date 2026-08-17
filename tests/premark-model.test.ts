import { FileSystem } from "@effect/platform"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Either, Layer, Schema } from "effect"
import { NodeContext } from "@effect/platform-node"
import { fileURLToPath } from "node:url"
import { markedModelIds } from "../src/models/allowlist.js"
import { Capturer, Sidecar } from "../src/services/capturer.js"

const layers = Effect.provide(Layer.mergeAll(Capturer.Default, NodeContext.layer))

describe("premark_unknown_model", () => {
  it.scoped("refuses models not on the allowlist", () =>
    layers(
      Effect.gen(function* () {
        expect(markedModelIds).toEqual([])
        const result = yield* Capturer.capture({
          model: "claude-opus-5",
          prompt: "say hello",
          allowlist: []
        }).pipe(Effect.either)
        expect(Either.isLeft(result)).toBe(true)
        if (Either.isLeft(result)) {
          expect(result.left._tag).toBe("PreMarkModel")
        }
      })
    )
  )

  it.scoped("committed allowlist json is an array and may be empty", () =>
    layers(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const raw = yield* fs.readFileString(
          fileURLToPath(new URL("../src/models/allowlist.json", import.meta.url))
        )
        const parsed: unknown = JSON.parse(raw)
        expect(Array.isArray(parsed)).toBe(true)
        expect(parsed).toEqual([...markedModelIds])
      })
    )
  )

  it("sidecar schema has no watermarked or sampled field", () => {
    const sidecar = new Sidecar({
      capturedFrom: "https://api.anthropic.com/v1/messages",
      model: "claude-opus-5",
      created: "2026-08-16T00:00:00.000Z",
      tokenCount: 12
    })
    const encoded = JSON.stringify(Schema.encodeUnknownSync(Sidecar)(sidecar))
    expect(encoded).not.toMatch(/watermarked|sampled/i)
    expect(encoded).not.toMatch(/sk-ant/i)
  })
})
