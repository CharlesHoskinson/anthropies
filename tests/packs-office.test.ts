import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { readFileSync } from "node:fs"
import { makeArtifact } from "../src/core/domain.js"
import { zipMembers } from "../src/formats/zip.js"
import { docxPack } from "../src/packs/docx.js"
import { odtPack } from "../src/packs/odt.js"

const inspectCtx = {
  operation: "inspect" as const,
  forceText: false,
  json: true,
  requireCapability: [] as ReadonlyArray<string>,
  kernelApiVersion: "1.0.0" as const
}
const enc = (s: string): Uint8Array => new TextEncoder().encode(s)
const sampleDocx = (): Uint8Array =>
  zipMembers([
    { name: "[Content_Types].xml", data: enc(`<Types></Types>`) },
    { name: "word/document.xml", data: enc(`<w:document><w:t>hello</w:t></w:document>`) },
    {
      name: "docProps/core.xml",
      data: enc(`<cp:coreProperties><dc:creator>Claude</dc:creator></cp:coreProperties>`)
    }
  ])

describe("packs_office", () => {
  it("docx source imports cleanDocx", () => {
    const src = readFileSync(new URL("../src/packs/docx.ts", import.meta.url), "utf8")
    expect(src).toMatch(/from "\.\.\/formats\/docx\.js"/)
    expect(src).toMatch(/cleanDocx/)
    expect(src).not.toMatch(/new TextDecoder\("utf-8"\)\.decode\(artifact\.bytes\)/)
  })

  it("odt source imports inspectOdt", () => {
    const src = readFileSync(new URL("../src/packs/odt.ts", import.meta.url), "utf8")
    expect(src).toMatch(/from "\.\.\/formats\/odt\.js"/)
    expect(src).toMatch(/inspectOdt/)
  })

  it("docx creator meta is present", async () => {
    const findings = await Effect.runPromise(
      docxPack.inspect(makeArtifact(sampleDocx(), "docx", { name: "owned.docx" }), inspectCtx)
    )
    expect(docxPack.manifest.id).toBe("anthropies.docx")
    expect(findings.some((f) => f.markClass === "provenance-metadata" && f.status === "present")).toBe(
      true
    )
  })
})
