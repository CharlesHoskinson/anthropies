import { FileSystem } from "@effect/platform"
import { Command } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { fileURLToPath } from "node:url"
import { inspectRasterBytes, stripRasterBytes } from "../src/formats/raster.js"
import { classify } from "../src/kind.js"
import { hasManifestFromToolOutput } from "../src/services/c2pa.js"
import { Cleaner } from "../src/services/cleaner.js"
import { Inspector } from "../src/services/inspector.js"

const fixturePng = fileURLToPath(
  new URL("../fixtures/c2pa/fixture-c2pa-present.png", import.meta.url)
)
const fixtureJpg = fileURLToPath(
  new URL("../fixtures/c2pa/fixture-c2pa-present.jpg", import.meta.url)
)
const fixtureSvg = fileURLToPath(
  new URL("../fixtures/c2pa/fixture-c2pa-present.svg", import.meta.url)
)

const layers = Effect.provide(
  Layer.mergeAll(Inspector.Default, Cleaner.Default, NodeContext.layer)
)

const c2paPresent = (report: { readonly findings: ReadonlyArray<{ readonly channel: string; readonly status: string }> }): boolean =>
  report.findings.some((f) => f.channel === "c2pa" && f.status === "present")

describe("cert_c2pa_png_jpeg_svg", () => {
  it.scoped("inspect sees planted c2pa and clean drops it", () =>
    layers(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const dir = yield* fs.makeTempDirectoryScoped()
        const src = `${dir}/fixture-c2pa-present.png`
        yield* fs.copy(fixturePng, src)
        const before = yield* Inspector.inspect(src, { forceText: false, json: false })
        expect(c2paPresent(before)).toBe(true)
        expect(before.degraded).toBe(false)
        expect(before.honesty.join("\n")).toMatch(/soft-binding/)
        const dest = `${dir}/out.png`
        const { bytes } = yield* Cleaner.clean(src, {
          forceText: false,
          json: false,
          inPlace: false,
          output: dest
        })
        expect(bytes[0]).toBe(0x89)
        expect(Array.from(bytes.subarray(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47])
        const after = yield* Inspector.inspect(dest, { forceText: false, json: false })
        expect(c2paPresent(after)).toBe(false)
        expect(after.degraded).toBe(false)
        expect(after.honesty.join("\n")).toMatch(/soft-binding/)
      })
    )
  )

  it.scoped("inspect sees planted jpeg c2pa and clean drops it", () =>
    layers(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const dir = yield* fs.makeTempDirectoryScoped()
        const src = `${dir}/fixture-c2pa-present.jpg`
        yield* fs.copy(fixtureJpg, src)
        const before = yield* Inspector.inspect(src, { forceText: false, json: false })
        expect(c2paPresent(before)).toBe(true)
        expect(before.degraded).toBe(false)
        const dest = `${dir}/out.jpg`
        const { bytes } = yield* Cleaner.clean(src, {
          forceText: false,
          json: false,
          inPlace: false,
          output: dest
        })
        expect(bytes[0]).toBe(0xff)
        expect(bytes[1]).toBe(0xd8)
        expect(bytes[2]).toBe(0xff)
        const after = yield* Inspector.inspect(dest, { forceText: false, json: false })
        expect(c2paPresent(after)).toBe(false)
        expect(after.degraded).toBe(false)
        expect(after.honesty.join("\n")).toMatch(/soft-binding/)
      })
    )
  )

  it.scoped("inspect sees planted svg metadata and clean drops it", () =>
    layers(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const dir = yield* fs.makeTempDirectoryScoped()
        const src = `${dir}/fixture-c2pa-present.svg`
        yield* fs.copy(fixtureSvg, src)
        const before = yield* Inspector.inspect(src, { forceText: false, json: false })
        expect(before.kind).toBe("svg")
        expect(c2paPresent(before)).toBe(true)
        expect(before.degraded).toBe(false)
        const dest = `${dir}/out.svg`
        const { bytes } = yield* Cleaner.clean(src, {
          forceText: false,
          json: false,
          inPlace: false,
          output: dest
        })
        const cleaned = new TextDecoder().decode(bytes)
        expect(cleaned).toMatch(/<svg/)
        expect(cleaned).not.toMatch(/<metadata/i)
        expect(cleaned).not.toMatch(/c2pa/)
        const after = yield* Inspector.inspect(dest, { forceText: false, json: false })
        expect(c2paPresent(after)).toBe(false)
        expect(after.degraded).toBe(false)
      })
    )
  )
})

const unparsedRasters: ReadonlyArray<{
  readonly name: "webp" | "avif" | "heic"
  readonly ext: string
  readonly bytes: Uint8Array
}> = [
  {
    name: "webp",
    ext: "webp",
    bytes: new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
  },
  {
    name: "avif",
    ext: "avif",
    bytes: new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66])
  },
  {
    name: "heic",
    ext: "heic",
    bytes: new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63])
  }
]

describe("cert_c2pa_unparsed_raster", () => {
  it("magic-only webp/avif/heic are raster and not certified absent", () => {
    for (const fixture of unparsedRasters) {
      expect(classify(fixture.bytes, `.${fixture.ext}`)).toBe("raster")
      const inspected = inspectRasterBytes(fixture.bytes)
      expect(inspected.ok).toBe(true)
      if (!inspected.ok) {
        continue
      }
      expect(inspected.applicable).toBe(false)
      const stripped = stripRasterBytes(fixture.bytes)
      expect(stripped.ok).toBe(true)
      if (!stripped.ok) {
        continue
      }
      expect(stripped.applicable).toBe(false)
      expect(stripped.removed).toBe(false)
    }
  })

  it.scoped("inspect of webp/avif/heic does not certify c2pa absent", () =>
    layers(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const dir = yield* fs.makeTempDirectoryScoped()
        for (const fixture of unparsedRasters) {
          const src = `${dir}/owned.${fixture.ext}`
          yield* fs.writeFile(src, fixture.bytes)
          const report = yield* Inspector.inspect(src, { forceText: false, json: false })
          expect(report.kind).toBe("raster")
          const c2pa = report.findings.find((f) => f.channel === "c2pa")
          expect(c2pa).toBeDefined()
          expect(c2pa?.status).not.toBe("absent")
          expect(c2pa?.status).toBe("degraded")
          const honesty = report.honesty.join("\n")
          expect(honesty).not.toMatch(/^c2pa: absent$/m)
          expect(honesty).toMatch(/^c2pa: not-applicable$/m)
          expect(report.degraded).toBe(true)
        }
      })
    )
  )
})

describe("cert_c2patool_false_positive", () => {
  it("mock stdout No claim found is not a manifest", () => {
    expect(hasManifestFromToolOutput("No claim found")).toBe(false)
    expect(hasManifestFromToolOutput("No JUMBF data found")).toBe(false)
  })

  it.scoped("c2patool if present agrees cleaned png has no manifest", () =>
    layers(
      Effect.gen(function* () {
        const help = yield* Command.exitCode(Command.make("c2patool", "--help")).pipe(
          Effect.catchAll(() => Effect.succeed(127))
        )
        if (Number(help) !== 0) {
          return
        }
        const fs = yield* FileSystem.FileSystem
        const dir = yield* fs.makeTempDirectoryScoped()
        const src = `${dir}/fixture-c2pa-present.png`
        yield* fs.copy(fixturePng, src)
        const dest = `${dir}/out.png`
        yield* Cleaner.clean(src, {
          forceText: false,
          json: false,
          inPlace: false,
          output: dest
        })
        const stdout = yield* Command.string(Command.make("c2patool", dest)).pipe(
          Effect.catchAll(() => Effect.succeed(""))
        )
        expect(hasManifestFromToolOutput(stdout)).toBe(false)
      })
    )
  )
})
