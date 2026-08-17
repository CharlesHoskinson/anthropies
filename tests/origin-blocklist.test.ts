import { FileSystem } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { ConfigProvider, Effect, Either, Layer } from "effect"
import { Humanizer, originBlocked } from "../src/services/humanizer.js"

const layers = Effect.provide(Layer.mergeAll(Humanizer.Default, NodeContext.layer))

const blockedModel = Effect.withConfigProvider(
  ConfigProvider.fromMap(new Map([["ANTHROPIES_REWRITE_MODEL", "claude-opus"]]))
)

describe("origin_blocklist", () => {
  it("blocks claude, anthropic, gemini, synthid", () => {
    expect(originBlocked("claude", "llama")).toBe(true)
    expect(originBlocked("ollama", "gemini-2.5")).toBe(true)
    expect(originBlocked("openai-compatible", "synthid-demo")).toBe(true)
    expect(originBlocked("ollama", "llama3.2")).toBe(false)
    expect(originBlocked("print-prompt", "")).toBe(false)
  })

  it.scoped("OriginBlocked leaves input bytes unchanged", () =>
    blockedModel(
      layers(
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem
          const dir = yield* fs.makeTempDirectoryScoped()
          const path = `${dir}/owned.txt`
          const original = "The compiler rejected the patch.\n"
          yield* fs.writeFileString(path, original)
          const result = yield* Humanizer.humanizeFile(path, {
            forceText: false,
            json: false,
            inPlace: true
          }).pipe(Effect.either)
          expect(Either.isLeft(result)).toBe(true)
          if (Either.isLeft(result)) {
            expect(result.left._tag).toBe("OriginBlocked")
          }
          expect(yield* fs.readFileString(path)).toBe(original)
          expect(yield* fs.exists(`${path}.cleaned`)).toBe(false)
          expect(yield* fs.exists(`${path}.bak`)).toBe(false)
        })
      )
    )
  )
})
