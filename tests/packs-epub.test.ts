import { describe, expect, it } from "@effect/vitest"
import { Effect, Either } from "effect"
import { zipSync } from "fflate"
import { readFileSync } from "node:fs"
import { CapabilityFailure, makeArtifact } from "../src/core/domain.js"
import { zipExpansionCapBytes } from "../src/formats/zip.js"
import { epubPack } from "../src/packs/epub.js"

const inspectCtx = {
  operation: "inspect" as const,
  forceText: false,
  json: true,
  requireCapability: [] as ReadonlyArray<string>,
  kernelApiVersion: "1.0.0" as const
}

const transformCtx = {
  operation: "remove" as const,
  forceText: false,
  json: true,
  requireCapability: [] as ReadonlyArray<string>,
  kernelApiVersion: "1.0.0" as const
}

const enc = (s: string): Uint8Array => new TextEncoder().encode(s)

const sampleEpub = (): Uint8Array =>
  zipSync({
    mimetype: enc("application/epub+zip"),
    "OEBPS/content.opf": enc(
      `<?xml version="1.0"?>` +
        `<package xmlns="http://www.idpf.org/2007/opf">` +
        `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">` +
        `<dc:creator>Claude</dc:creator>` +
        `</metadata>` +
        `</package>`
    )
  })

const u16 = (n: number): Uint8Array => new Uint8Array([n & 0xff, (n >> 8) & 0xff])
const u32 = (n: number): Uint8Array =>
  new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff])

const concat = (parts: ReadonlyArray<Uint8Array>): Uint8Array => {
  let size = 0
  for (const p of parts) {
    size += p.length
  }
  const out = new Uint8Array(size)
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

/** Tiny stored zip whose CD claims expansion above zipExpansionCapBytes. */
const claimedHugeEpub = (): Uint8Array => {
  const name = enc("OEBPS/content.opf")
  const data = enc("<package/>")
  const huge = zipExpansionCapBytes + 1
  const local = concat([
    new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
    u16(20),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u32(0),
    u32(data.length),
    u32(huge),
    u16(name.length),
    u16(0),
    name,
    data
  ])
  const cd = concat([
    new Uint8Array([0x50, 0x4b, 0x01, 0x02]),
    u16(20),
    u16(20),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u32(0),
    u32(data.length),
    u32(huge),
    u16(name.length),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u32(0),
    u32(0),
    name
  ])
  const eocd = concat([
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]),
    u16(0),
    u16(0),
    u16(1),
    u16(1),
    u32(cd.length),
    u32(local.length),
    u16(0)
  ])
  return concat([local, cd, eocd])
}

describe("packs_epub", () => {
  it("epub source avoids full-zip utf8", () => {
    const src = readFileSync(new URL("../src/packs/epub.ts", import.meta.url), "utf8")
    expect(src).not.toMatch(/new TextDecoder\("utf-8"\)\.decode\(artifact\.bytes\)/)
    expect(src).not.toMatch(/score|watermarkScore/)
  })

  it("epub OPF creator is present", async () => {
    const findings = await Effect.runPromise(
      epubPack.inspect(makeArtifact(sampleEpub(), "epub", { name: "owned.epub" }), inspectCtx)
    )
    expect(epubPack.manifest.id).toBe("anthropies.epub")
    expect(epubPack.manifest.artifactKinds).toEqual(["epub"])
    expect(epubPack.manifest.markClasses).toEqual(["provenance-metadata"])
    expect(epubPack.manifest.channel).toBe("c2pa")
    expect(epubPack.manifest.operations).toEqual(["inspect", "remove"])
    expect(epubPack.manifest.distribution).toBe("core")
    expect(epubPack.manifest.license).toBe("apache-2.0")
    expect(epubPack.manifest.runtime).toBe("native-ts")
    expect(findings.some((f) => f.markClass === "provenance-metadata" && f.status === "present")).toBe(
      true
    )
  })

  it("epub zip bomb is refused", async () => {
    const bomb = claimedHugeEpub()
    const inspectResult = await Effect.runPromise(
      epubPack.inspect(makeArtifact(bomb, "epub", { name: "bomb.epub" }), inspectCtx).pipe(Effect.either)
    )
    expect(Either.isLeft(inspectResult)).toBe(true)
    if (Either.isLeft(inspectResult)) {
      expect(inspectResult.left).toBeInstanceOf(CapabilityFailure)
    }

    const transformResult = await Effect.runPromise(
      epubPack
        .transform(makeArtifact(bomb, "epub", { name: "bomb.epub" }), transformCtx)
        .pipe(Effect.either)
    )
    expect(Either.isLeft(transformResult)).toBe(true)
    if (Either.isLeft(transformResult)) {
      expect(transformResult.left).toBeInstanceOf(CapabilityFailure)
    }
  })
})
