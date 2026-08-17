import { FileSystem } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { zipMembers } from "../src/formats/zip.js"
import { Cleaner } from "../src/services/cleaner.js"
import { Inspector } from "../src/services/inspector.js"

const layers = Effect.provide(
  Layer.mergeAll(Inspector.Default, Cleaner.Default, NodeContext.layer)
)

const c2paPresent = (report: {
  readonly findings: ReadonlyArray<{ readonly channel: string; readonly status: string }>
}): boolean => report.findings.some((f) => f.channel === "c2pa" && f.status === "present")

const enc = (s: string): Uint8Array => new TextEncoder().encode(s)

const sampleDocx = (): Uint8Array =>
  zipMembers([
    {
      name: "[Content_Types].xml",
      data: enc(
        `<Types><Override PartName="/word/document.xml"/><Override PartName="/customXml/item1.xml"/></Types>`
      )
    },
    {
      name: "word/document.xml",
      data: enc(`<w:document><w:t>hello\u200Bworld</w:t></w:document>`)
    },
    {
      name: "docProps/core.xml",
      data: enc(`<cp:coreProperties><dc:creator>Claude</dc:creator></cp:coreProperties>`)
    },
    { name: "customXml/item1.xml", data: enc(`<item>c2pa planted</item>`) },
    {
      name: "word/_rels/document.xml.rels",
      data: enc(
        `<Relationships><Relationship Id="rId1" Target="document.xml"/><Relationship Id="rId9" Target="../customXml/item1.xml"/></Relationships>`
      )
    }
  ])

const sampleOdt = (): Uint8Array =>
  zipMembers([
    { name: "mimetype", data: enc("application/vnd.oasis.opendocument.text") },
    {
      name: "content.xml",
      data: enc(`<office:document-content><text:p>hello\u200Bworld</text:p></office:document-content>`)
    },
    {
      name: "meta.xml",
      data: enc(`<office:document-meta><meta:generator>Claude</meta:generator></office:document-meta>`)
    }
  ])

describe("cert_office_docx_odt", () => {
  it.scoped("scrubs docx props customXml and Layer A on w:t", () =>
    layers(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const dir = yield* fs.makeTempDirectoryScoped()
        const src = `${dir}/owned.docx`
        yield* fs.writeFile(src, sampleDocx())
        const before = yield* Inspector.inspect(src, { forceText: false, json: false })
        expect(before.kind).toBe("docx")
        expect(c2paPresent(before)).toBe(true)
        const dest = `${dir}/out.docx`
        const { bytes } = yield* Cleaner.clean(src, {
          forceText: false,
          json: false,
          inPlace: false,
          output: dest
        })
        expect(bytes[0]).toBe(0x50)
        expect(bytes[1]).toBe(0x4b)
        const after = yield* Inspector.inspect(dest, { forceText: false, json: false })
        expect(c2paPresent(after)).toBe(false)
        expect(after.findings.some((f) => f.channel === "deterministic" && f.status === "present")).toBe(
          false
        )
      })
    )
  )

  it.scoped("scrubs odt meta generator and Layer A on text nodes", () =>
    layers(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const dir = yield* fs.makeTempDirectoryScoped()
        const src = `${dir}/owned.odt`
        yield* fs.writeFile(src, sampleOdt())
        const before = yield* Inspector.inspect(src, { forceText: false, json: false })
        expect(before.kind).toBe("odt")
        expect(c2paPresent(before)).toBe(true)
        const dest = `${dir}/out.odt`
        yield* Cleaner.clean(src, {
          forceText: false,
          json: false,
          inPlace: false,
          output: dest
        })
        const after = yield* Inspector.inspect(dest, { forceText: false, json: false })
        expect(c2paPresent(after)).toBe(false)
        expect(after.degraded).toBe(false)
      })
    )
  )
})
