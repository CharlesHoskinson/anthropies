import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { readFileSync } from "node:fs"
import { makeArtifact } from "../src/core/domain.js"
import { htmlPack } from "../src/packs/html.js"
import { mdPack } from "../src/packs/md.js"

const inspectCtx = {
  operation: "inspect" as const,
  forceText: false,
  json: true,
  requireCapability: [] as ReadonlyArray<string>,
  kernelApiVersion: "1.0.0" as const
}

describe("packs_html_md", () => {
  it("html source imports inspectHtmlText", () => {
    const src = readFileSync(new URL("../src/packs/html.ts", import.meta.url), "utf8")
    expect(src).toMatch(/from "\.\.\/formats\/html\.js"/)
    expect(src).toMatch(/inspectHtmlText/)
    expect(src).not.toMatch(/score|watermarkScore/)
  })

  it("md source imports inspectMdText", () => {
    const src = readFileSync(new URL("../src/packs/md.ts", import.meta.url), "utf8")
    expect(src).toMatch(/from "\.\.\/formats\/md\.js"/)
    expect(src).toMatch(/inspectMdText/)
    expect(src).not.toMatch(/score|watermarkScore/)
  })

  it("html generator meta is present", async () => {
    const html = `<html><head><meta name="generator" content="Claude"></head><body>hello</body></html>`
    const findings = await Effect.runPromise(
      htmlPack.inspect(makeArtifact(new TextEncoder().encode(html), "html"), inspectCtx)
    )
    expect(htmlPack.manifest.id).toBe("anthropies.html")
    expect(findings.some((f) => f.markClass === "provenance-metadata" && f.status === "present")).toBe(
      true
    )
  })
})
