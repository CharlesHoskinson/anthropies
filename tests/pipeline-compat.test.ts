import { FileSystem } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Either, Layer } from "effect"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { builtinRegistry } from "../src/core/builtin-registry.js"
import { Cleaner } from "../src/services/cleaner.js"
import { Inspector } from "../src/services/inspector.js"

const trailerPath = fileURLToPath(new URL("../fixtures/layer-a/trailer-claude.txt", import.meta.url))
const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
const layers = Effect.provide(Layer.mergeAll(Inspector.Default, Cleaner.Default, NodeContext.layer))

describe("pipeline_compat", () => {
  it("builtin registry lists layer-a c2pa pdf", () => {
    const ids = builtinRegistry().list().map((pack) => pack.manifest.id)
    expect(ids).toEqual(
      expect.arrayContaining(["anthropies.layer-a", "anthropies.c2pa", "anthropies.pdf"])
    )
  })

  it.scoped("inspects trailer fixture as public Report", () =>
    layers(
      Effect.gen(function* () {
        const report = yield* Inspector.inspect(trailerPath, { forceText: false, json: true })
        expect(report.kind).toBe("text")
        const det = report.findings.find((finding) => finding.channel === "deterministic")
        expect(det?.status).toBe("present")
        expect(JSON.stringify(report)).not.toMatch(/"score"/)
      })
    )
  )

  it.scoped("clean strips trailer to dest and keeps original", () =>
    layers(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const dir = yield* fs.makeTempDirectoryScoped()
        const dest = `${dir}/out.txt`
        const original = yield* fs.readFile(trailerPath)
        const result = yield* Cleaner.clean(trailerPath, {
          forceText: false,
          json: true,
          inPlace: false,
          output: dest
        })
        const text = new TextDecoder().decode(result.bytes)
        expect(text).not.toMatch(/Co-Authored-By/)
        expect(Array.from(yield* fs.readFile(trailerPath))).toEqual(Array.from(original))
        expect(Array.from(yield* fs.readFile(dest))).toEqual(Array.from(result.bytes))
      })
    )
  )

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
        expect(Array.from(yield* fs.readFile(path))).toEqual(Array.from(PNG_MAGIC))
        expect(yield* fs.exists(`${path}.bak`)).toBe(false)
      })
    )
  )

  it("inspector source calls inspectArtifact and inspectDocx", () => {
    const src = readFileSync("src/services/inspector.ts", "utf8")
    expect(src).toMatch(/inspectArtifact/)
    expect(src).toMatch(/inspectDocx/)
    expect(src).toMatch(/inspectOdt/)
  })

  it("cleaner source calls transformArtifact writeAtomic and PdfTools", () => {
    const src = readFileSync("src/services/cleaner.ts", "utf8")
    expect(src).toMatch(/transformArtifact/)
    expect(src).toMatch(/writeAtomic/)
    expect(src).toMatch(/PdfTools/)
    expect(src).toMatch(/cleanDocx/)
    expect(src).toMatch(/cleanOdt/)
    expect(src).not.toMatch(/pdfPack/)
  })

  it("inspector source builds an artifact from classified kind", () => {
    const src = readFileSync("src/services/inspector.ts", "utf8")
    expect(src).toMatch(/makeArtifact\(owned\.bytes,\s*owned\.kind/)
    expect(src).toMatch(/inspectArtifact/)
  })

  it.scoped("inspects raster fixture as kind raster without score", () =>
    layers(
      Effect.gen(function* () {
        const path = fileURLToPath(
          new URL("../fixtures/c2pa/fixture-c2pa-present.png", import.meta.url)
        )
        const report = yield* Inspector.inspect(path, { forceText: false, json: true })
        expect(report.kind).toBe("raster")
        expect(JSON.stringify(report)).not.toMatch(/"score"/)
      })
    )
  )
})
