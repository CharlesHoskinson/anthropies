import { describe, expect, it } from "@effect/vitest"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { inspectRasterBytes, stripRasterBytes } from "../src/formats/raster.js"
import { rasterCodec } from "../src/kind.js"

const enc = new TextEncoder()

const concat = (...parts: ReadonlyArray<Uint8Array>): Uint8Array => {
  let size = 0
  for (const part of parts) {
    size += part.length
  }
  const out = new Uint8Array(size)
  let off = 0
  for (const part of parts) {
    out.set(part, off)
    off += part.length
  }
  return out
}

const u32le = (n: number): Uint8Array => {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, n >>> 0, true)
  return b
}

const u32be = (n: number): Uint8Array => {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, n >>> 0, false)
  return b
}

const riffChunk = (fourcc: string, data: Uint8Array): Uint8Array => {
  const pad = data.length % 2 === 1 ? new Uint8Array([0]) : new Uint8Array(0)
  return concat(enc.encode(fourcc), u32le(data.length), data, pad)
}

const buildWebp = (...chunks: ReadonlyArray<Uint8Array>): Uint8Array => {
  const body = concat(...chunks)
  return concat(enc.encode("RIFF"), u32le(4 + body.length), enc.encode("WEBP"), body)
}

const box = (type: string, payload: Uint8Array): Uint8Array =>
  concat(u32be(8 + payload.length), enc.encode(type), payload)

const ascii = (bytes: Uint8Array, start: number, end: number): string =>
  String.fromCharCode(...bytes.subarray(start, end))

const u32leAt = (bytes: Uint8Array, offset: number): number =>
  new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true)

/** Sum of VP8 / VP8L / VP8X chunk payload lengths (image data, not metadata). */
const webpImagePayloadLength = (bytes: Uint8Array): number => {
  if (bytes.length < 12 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 12) !== "WEBP") {
    return -1
  }
  let off = 12
  let total = 0
  while (off + 8 <= bytes.length) {
    const type = ascii(bytes, off, off + 4)
    const size = u32leAt(bytes, off + 4)
    const dataStart = off + 8
    const dataEnd = dataStart + size
    if (dataEnd > bytes.length) {
      return -1
    }
    if (type === "VP8 " || type === "VP8L" || type === "VP8X") {
      total += size
    }
    off = dataEnd + (size % 2)
  }
  return total
}

const digest = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex")

const VP8_PAYLOAD = new Uint8Array([0x9d, 0x01, 0x2a, 0x01, 0x00, 0x01, 0x00, 0x00])
const XMP_PAYLOAD = enc.encode(
  '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>' +
    "<x:xmpmeta><digitalSourceType>trainedAlgorithmicMedia</digitalSourceType></x:xmpmeta>" +
    '<?xpacket end="w"?>'
)

const webpWithProvenance = (): Uint8Array =>
  buildWebp(riffChunk("VP8 ", VP8_PAYLOAD), riffChunk("XMP ", XMP_PAYLOAD))

const cleanAvif = (): Uint8Array => {
  const ftypPayload = concat(enc.encode("avif"), u32be(0), enc.encode("avif"))
  const metaPayload = new Uint8Array([0, 0, 0, 0])
  return concat(box("ftyp", ftypPayload), box("meta", metaPayload))
}

const WEBP_STUB = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
const HEIC_STUB = new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63])

/** HEIC magic plus truncated trailing bytes so box parse cannot succeed. */
const undecodableHeic = (): Uint8Array =>
  concat(HEIC_STUB, new Uint8Array([0x00, 0x00, 0x00, 0x10, 0x6d, 0x65, 0x74]))

/** Minimal GIF89a with Adobe XMP application extension (`XMP DataXMP`). */
const gifWithXmp = (): Uint8Array => {
  const header = concat(
    enc.encode("GIF89a"),
    new Uint8Array([0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00])
  )
  const appIntro = new Uint8Array([0x21, 0xff, 0x0b])
  const appId = enc.encode("XMP DataXMP")
  const xmpBlocks: Array<Uint8Array> = []
  let i = 0
  while (i < XMP_PAYLOAD.length) {
    const slice = XMP_PAYLOAD.subarray(i, Math.min(i + 255, XMP_PAYLOAD.length))
    xmpBlocks.push(concat(new Uint8Array([slice.length]), slice))
    i += slice.length
  }
  xmpBlocks.push(new Uint8Array([0x00]))
  const image = new Uint8Array([
    0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00
  ])
  const trailer = new Uint8Array([0x3b])
  return concat(header, appIntro, appId, ...xmpBlocks, image, trailer)
}

/** TIFF little-endian magic with IFD offset past EOF so IFD parse fails. */
const undecodableTiff = (): Uint8Array =>
  new Uint8Array([0x49, 0x49, 0x2a, 0x00, 0x00, 0x10, 0x00, 0x00])

describe("formats_phase_b_raster", () => {
  it("strip preserves image dimensions metadata contract", () => {
    const input = webpWithProvenance()
    const beforeLen = webpImagePayloadLength(input)
    expect(beforeLen).toBeGreaterThan(0)
    const stripped = stripRasterBytes(input)
    expect(stripped.ok).toBe(true)
    if (!stripped.ok) {
      return
    }
    expect(stripped.applicable).toBe(true)
    expect(stripped.removed).toBe(true)
    expect(rasterCodec(stripped.bytes)).toBe("webp")
    expect(webpImagePayloadLength(stripped.bytes)).toBe(beforeLen)
  })

  it("pack sources reject pixel mark class", () => {
    const rasterSrc = readFileSync(new URL("../src/formats/raster.ts", import.meta.url), "utf8")
    const stripSrc = readFileSync(new URL("../src/packs/raster-strip.ts", import.meta.url), "utf8")
    expect(rasterSrc).not.toMatch(/markClass\s*:\s*["']pixel["']/)
    expect(rasterSrc).not.toMatch(/markClasses\s*:\s*\[[^\]]*["']pixel["']/)
    expect(rasterSrc).not.toMatch(/\bpixel\b/)
    expect(stripSrc).not.toMatch(/markClass\s*:\s*["']pixel["']/)
    expect(stripSrc).not.toMatch(/markClasses\s*:\s*\[[^\]]*["']pixel["']/)
  })

  it("parsed WebP with C2PA is present", () => {
    const inspected = inspectRasterBytes(webpWithProvenance())
    expect(inspected.ok).toBe(true)
    if (!inspected.ok) {
      return
    }
    expect(inspected.applicable).toBe(true)
    expect(inspected.present).toBe(true)
  })

  it("parsed clean AVIF is absent", () => {
    const bytes = cleanAvif()
    expect(rasterCodec(bytes)).toBe("avif")
    const inspected = inspectRasterBytes(bytes)
    expect(inspected.ok).toBe(true)
    if (!inspected.ok) {
      return
    }
    expect(inspected.applicable).toBe(true)
    expect(inspected.present).toBe(false)
  })

  it("undecodable HEIC is not certified absent", () => {
    const bytes = undecodableHeic()
    expect(rasterCodec(bytes)).toBe("heic")
    const inspected = inspectRasterBytes(bytes)
    if (!inspected.ok) {
      return
    }
    expect(inspected.applicable && inspected.present === false).toBe(false)
  })

  it("WebP strip clears provenance", () => {
    const input = webpWithProvenance()
    const stripped = stripRasterBytes(input)
    expect(stripped.ok).toBe(true)
    if (!stripped.ok) {
      return
    }
    expect(stripped.removed).toBe(true)
    expect(stripped.applicable).toBe(true)
    const reinspected = inspectRasterBytes(stripped.bytes)
    expect(reinspected.ok).toBe(true)
    if (!reinspected.ok) {
      return
    }
    expect(reinspected.applicable).toBe(true)
    expect(reinspected.present).toBe(false)
  })

  it("non-applicable codec strip is unchanged", () => {
    const before = digest(WEBP_STUB)
    const stripped = stripRasterBytes(WEBP_STUB)
    expect(stripped.ok).toBe(true)
    if (!stripped.ok) {
      return
    }
    expect(stripped.applicable).toBe(false)
    expect(stripped.removed).toBe(false)
    expect(digest(stripped.bytes)).toBe(before)
  })

  it("GIF with XMP extension is present", () => {
    const bytes = gifWithXmp()
    expect(rasterCodec(bytes)).toBe("gif")
    const inspected = inspectRasterBytes(bytes)
    expect(inspected.ok).toBe(true)
    if (!inspected.ok) {
      return
    }
    expect(inspected.applicable).toBe(true)
    expect(inspected.present).toBe(true)
    const stripped = stripRasterBytes(bytes)
    expect(stripped.ok).toBe(true)
    if (!stripped.ok) {
      return
    }
    expect(stripped.applicable).toBe(true)
    expect(stripped.removed).toBe(true)
    const reinspected = inspectRasterBytes(stripped.bytes)
    expect(reinspected.ok).toBe(true)
    if (!reinspected.ok) {
      return
    }
    expect(reinspected.applicable).toBe(true)
    expect(reinspected.present).toBe(false)
  })

  it("undecodable TIFF is not absent", () => {
    const bytes = undecodableTiff()
    expect(rasterCodec(bytes)).toBe("tiff")
    const inspected = inspectRasterBytes(bytes)
    if (!inspected.ok) {
      return
    }
    expect(inspected.applicable && inspected.present === false).toBe(false)
  })

  it("BMFF mdat with c2pa letters is not stripped", () => {
    const ftypPayload = concat(enc.encode("avif"), u32be(0), enc.encode("avif"))
    const bytes = concat(box("ftyp", ftypPayload), box("mdat", enc.encode("c2pa")))
    expect(rasterCodec(bytes)).toBe("avif")
    const before = digest(bytes)
    const inspected = inspectRasterBytes(bytes)
    expect(inspected.ok).toBe(true)
    if (!inspected.ok) {
      return
    }
    expect(inspected.applicable).toBe(true)
    expect(inspected.present).toBe(false)
    const stripped = stripRasterBytes(bytes)
    expect(stripped.ok).toBe(true)
    if (!stripped.ok) {
      return
    }
    expect(stripped.removed).toBe(false)
    expect(digest(stripped.bytes)).toBe(before)
  })
})
