import { FileSystem } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Either, Layer } from "effect"
import { Cleaner } from "../src/services/cleaner.js"
import { Inspector } from "../src/services/inspector.js"

const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
const DOCX_PK = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00])

const layers = Effect.provide(
  Layer.mergeAll(Inspector.Default, Cleaner.Default, NodeContext.layer)
)

describe("binary_guard_docx_png_stdin", () => {
  it.scoped("refuses truncated PNG inspect and writes nothing", () =>
    layers(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const dir = yield* fs.makeTempDirectoryScoped()
        const path = `${dir}/fixture.png`
        yield* fs.writeFile(path, PNG_MAGIC)
        const result = yield* Inspector.inspect(path, { forceText: false, json: false }).pipe(
          Effect.either
        )
        expect(Either.isLeft(result)).toBe(true)
        if (Either.isLeft(result)) {
          expect(result.left._tag).toBe("DecodeError")
        }
        expect(yield* fs.exists(`${path}.cleaned`)).toBe(false)
        expect(yield* fs.exists(`${path}.bak`)).toBe(false)
      })
    )
  )

  it.scoped("refuses DOCX PK prefix on clean and writes nothing", () =>
    layers(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const dir = yield* fs.makeTempDirectoryScoped()
        const path = `${dir}/fixture.docx`
        yield* fs.writeFile(path, DOCX_PK)
        const result = yield* Cleaner.clean(path, {
          forceText: false,
          json: false,
          inPlace: false
        }).pipe(Effect.either)
        expect(Either.isLeft(result)).toBe(true)
        if (Either.isLeft(result)) {
          expect(result.left._tag).toBe("DecodeError")
        }
        expect(yield* fs.exists(`${path}.cleaned`)).toBe(false)
        expect(yield* fs.exists(`${path}.bak`)).toBe(false)
        expect(Array.from(yield* fs.readFile(path))).toEqual(Array.from(DOCX_PK))
      })
    )
  )

  it.scoped("force-text proceeds on PNG inspect", () =>
    layers(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const dir = yield* fs.makeTempDirectoryScoped()
        const path = `${dir}/fixture.png`
        yield* fs.writeFile(path, PNG_MAGIC)
        const report = yield* Inspector.inspect(path, { forceText: true, json: false })
        expect(report.kind).toBe("raster")
        expect(yield* fs.exists(`${path}.bak`)).toBe(false)
      })
    )
  )
})
