import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import { Kind, classify, rasterCodec } from "../src/kind.js"

describe("kind_phase_b", () => {
  it("BMP magic is raster", () => {
    const bytes = new Uint8Array([0x42, 0x4d, 0, 0, 0, 0])
    expect(classify(bytes)).toBe("raster")
    expect(rasterCodec(bytes)).toBe("bmp")
  })

  it("TIFF little-endian magic is raster", () => {
    const bytes = new Uint8Array([0x49, 0x49, 0x2a, 0x00])
    expect(classify(bytes)).toBe("raster")
    expect(rasterCodec(bytes)).toBe("tiff")
  })

  it("TIFF big-endian magic is raster", () => {
    const bytes = new Uint8Array([0x4d, 0x4d, 0x00, 0x2a])
    expect(classify(bytes)).toBe("raster")
    expect(rasterCodec(bytes)).toBe("tiff")
  })

  it("WebP remains raster kind", () => {
    const bytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50
    ])
    expect(classify(bytes)).toBe("raster")
    expect(rasterCodec(bytes)).toBe("webp")
  })

  it("AVIF remains raster kind", () => {
    const bytes = new Uint8Array([
      0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66
    ])
    expect(classify(bytes)).toBe("raster")
    expect(rasterCodec(bytes)).toBe("avif")
  })

  it("Kind literals include office and epub", () => {
    const kinds = Schema.decodeSync(Schema.Array(Kind))(["xlsx", "pptx", "epub"])
    expect(kinds).toEqual(["xlsx", "pptx", "epub"])
  })

  it("xlsx suffix on PK is xlsx", () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
    expect(classify(bytes, ".xlsx")).toBe("xlsx")
  })

  it("pptx suffix on PK is pptx", () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
    expect(classify(bytes, ".pptx")).toBe("pptx")
  })

  it("epub suffix on PK is epub", () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
    expect(classify(bytes, ".epub")).toBe("epub")
  })

  it("PK without known office suffix stays binary", () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
    expect(classify(bytes)).toBe("binary")
    expect(classify(bytes, ".zip")).toBe("binary")
  })
})
