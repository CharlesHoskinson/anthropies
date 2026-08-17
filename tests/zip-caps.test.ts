import { FileSystem } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Either, Layer } from "effect"
import { unzipCapped, zipMembers } from "../src/formats/zip.js"
import { Cleaner } from "../src/services/cleaner.js"

const layers = Effect.provide(Layer.mergeAll(Cleaner.Default, NodeContext.layer))

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

/** Tiny stored zip whose CD claims a huge uncompressed size. Not a real bomb. */
const claimedHugeZip = (): Uint8Array => {
  const name = new TextEncoder().encode("word/document.xml")
  const data = new TextEncoder().encode("tiny")
  const huge = 200 * 1024 * 1024
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

describe("zip_bomb_and_caps", () => {
  it("uncompressed over patched 16-byte cap is DecodeError", () => {
    const packed = zipMembers([{ name: "word/document.xml", data: new TextEncoder().encode("x".repeat(32)) }])
    const result = unzipCapped(packed, "fixture.docx", 16)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toMatch(/zip/i)
    }
  })

  it.scoped("claimed over-cap office clean writes nothing", () =>
    layers(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const dir = yield* fs.makeTempDirectoryScoped()
        const path = `${dir}/fixture.docx`
        yield* fs.writeFile(path, claimedHugeZip())
        const result = yield* Cleaner.clean(path, {
          forceText: false,
          json: false,
          inPlace: false
        }).pipe(Effect.either)
        expect(Either.isLeft(result)).toBe(true)
        if (Either.isLeft(result)) {
          expect(result.left._tag).toBe("DecodeError")
        }
        expect(yield* fs.exists(`${path}.cleaned`)).toBe(false)
        expect(yield* fs.exists(`${path}.bak`)).toBe(false)
      })
    )
  )
})
