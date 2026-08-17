import { FileSystem } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { Cleaner } from "../src/services/cleaner.js"
import { Inspector } from "../src/services/inspector.js"

const layers = Effect.provide(
  Layer.mergeAll(Inspector.Default, Cleaner.Default, NodeContext.layer)
)

const c2paPresent = (report: {
  readonly findings: ReadonlyArray<{ readonly channel: string; readonly status: string }>
}): boolean => report.findings.some((f) => f.channel === "c2pa" && f.status === "present")

const detPresent = (report: {
  readonly findings: ReadonlyArray<{ readonly channel: string; readonly status: string }>
}): boolean => report.findings.some((f) => f.channel === "deterministic" && f.status === "present")

describe("cert_markup_html_md", () => {
  it.scoped("strips html generator data-ai and json-ld then Layer A", () =>
    layers(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const dir = yield* fs.makeTempDirectoryScoped()
        const src = `${dir}/owned.html`
        yield* fs.writeFileString(
          src,
          `<html><head><meta name="generator" content="Claude">` +
            `<script type="application/ld+json">{"digitalSourceType":"trainedAlgorithmicMedia"}</script>` +
            `</head><body data-ai-model="claude">hello\u200Bworld</body></html>\n`
        )
        const before = yield* Inspector.inspect(src, { forceText: false, json: false })
        expect(before.kind).toBe("html")
        expect(c2paPresent(before)).toBe(true)
        expect(detPresent(before)).toBe(true)
        const dest = `${dir}/out.html`
        const { bytes } = yield* Cleaner.clean(src, {
          forceText: false,
          json: false,
          inPlace: false,
          output: dest
        })
        const cleaned = new TextDecoder().decode(bytes)
        expect(cleaned).not.toMatch(/generator/i)
        expect(cleaned).not.toMatch(/data-ai/i)
        expect(cleaned).not.toMatch(/digitalSourceType/)
        expect(cleaned).toMatch(/helloworld/)
        const after = yield* Inspector.inspect(dest, { forceText: false, json: false })
        expect(c2paPresent(after)).toBe(false)
        expect(detPresent(after)).toBe(false)
      })
    )
  )

  it.scoped("drops markdown frontmatter AI keys then Layer A", () =>
    layers(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const dir = yield* fs.makeTempDirectoryScoped()
        const src = `${dir}/owned.md`
        yield* fs.writeFileString(
          src,
          "---\ntitle: keep\nai_generated: true\ngenerator: claude\n---\nhello\u200Bworld\n"
        )
        const before = yield* Inspector.inspect(src, { forceText: false, json: false })
        expect(before.kind).toBe("md")
        expect(c2paPresent(before)).toBe(true)
        expect(detPresent(before)).toBe(true)
        const dest = `${dir}/out.md`
        const { bytes } = yield* Cleaner.clean(src, {
          forceText: false,
          json: false,
          inPlace: false,
          output: dest
        })
        const cleaned = new TextDecoder().decode(bytes)
        expect(cleaned).toMatch(/title: keep/)
        expect(cleaned).not.toMatch(/ai_generated/)
        expect(cleaned).not.toMatch(/generator: claude/)
        expect(cleaned).toMatch(/helloworld/)
        const after = yield* Inspector.inspect(dest, { forceText: false, json: false })
        expect(c2paPresent(after)).toBe(false)
        expect(detPresent(after)).toBe(false)
      })
    )
  )
})
