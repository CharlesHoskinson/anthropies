import { FileSystem } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Either, Layer } from "effect"
import { Cleaner } from "../src/services/cleaner.js"

const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])

const layers = Effect.provide(Layer.mergeAll(Cleaner.Default, NodeContext.layer))

describe("write_guard", () => {
  it.scoped("in-place after failed classify does not write or create backup", () =>
    layers(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const dir = yield* fs.makeTempDirectoryScoped()
        const path = `${dir}/owned.png`
        yield* fs.writeFile(path, PNG_MAGIC)
        const result = yield* Cleaner.clean(path, {
          forceText: false,
          json: false,
          inPlace: true
        }).pipe(Effect.either)
        expect(Either.isLeft(result)).toBe(true)
        if (Either.isLeft(result)) {
          expect(result.left._tag).toBe("BinaryInput")
        }
        expect(Array.from(yield* fs.readFile(path))).toEqual(Array.from(PNG_MAGIC))
        expect(yield* fs.exists(`${path}.bak`)).toBe(false)
        expect(yield* fs.exists(`${path}.cleaned`)).toBe(false)
      })
    )
  )

  it.scoped("refuses a symlink dest and does not create backup", () =>
    layers(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const dir = yield* fs.makeTempDirectoryScoped()
        const src = `${dir}/note.txt`
        const target = `${dir}/real.txt`
        const dest = `${dir}/out.txt`
        yield* fs.writeFileString(src, "hello\n")
        yield* fs.writeFileString(target, "keep\n")
        yield* fs.symlink(target, dest)
        const result = yield* Cleaner.clean(src, {
          forceText: false,
          json: false,
          inPlace: false,
          output: dest
        }).pipe(Effect.either)
        expect(Either.isLeft(result)).toBe(true)
        if (Either.isLeft(result)) {
          expect(result.left._tag).toBe("WriteGuard")
        }
        expect(yield* fs.readFileString(src)).toBe("hello\n")
        expect(yield* fs.readFileString(target)).toBe("keep\n")
        expect(yield* fs.exists(`${src}.bak`)).toBe(false)
        expect(yield* fs.exists(`${dest}.bak`)).toBe(false)
      })
    )
  )
})
