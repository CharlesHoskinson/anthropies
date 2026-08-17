import { unzipSync, zipSync } from "fflate"

/** Uncompressed zip expansion cap from spec §12. */
export const zipExpansionCapBytes = 128 * 1024 * 1024

export interface ZipMember {
  readonly name: string
  readonly data: Uint8Array
}

export type ZipOk = { readonly ok: true; readonly members: ReadonlyArray<ZipMember> }
export type ZipFail = { readonly ok: false; readonly reason: string }

const SIG_EOCD = 0x06054b50
const SIG_CD = 0x02014b50

const u16le = (bytes: Uint8Array, off: number): number =>
  (bytes[off] ?? 0) | ((bytes[off + 1] ?? 0) << 8)

const u32le = (bytes: Uint8Array, off: number): number => u16le(bytes, off) + u16le(bytes, off + 2) * 0x10000

const findEocd = (bytes: Uint8Array): number | undefined => {
  if (bytes.length < 22) {
    return undefined
  }
  const min = Math.max(0, bytes.length - 22 - 65535)
  for (let i = bytes.length - 22; i >= min; i--) {
    if (u32le(bytes, i) === SIG_EOCD) {
      return i
    }
  }
  return undefined
}

const zipUncompressedSizes = (
  bytes: Uint8Array
): { readonly ok: true; readonly total: number; readonly maxMember: number } | ZipFail => {
  const eocd = findEocd(bytes)
  if (eocd === undefined) {
    return { ok: false, reason: "undecodable zip: missing eocd" }
  }
  const cdOff = u32le(bytes, eocd + 16)
  const entries = u16le(bytes, eocd + 10)
  let off = cdOff
  let total = 0
  let maxMember = 0
  for (let n = 0; n < entries; n++) {
    if (off + 46 > bytes.length || u32le(bytes, off) !== SIG_CD) {
      return { ok: false, reason: "undecodable zip: central directory" }
    }
    const uncomp = u32le(bytes, off + 24)
    const nameLen = u16le(bytes, off + 28)
    const extraLen = u16le(bytes, off + 30)
    const commentLen = u16le(bytes, off + 32)
    if (uncomp === 0xffffffff) {
      return { ok: false, reason: `zip expansion exceeds ${String(zipExpansionCapBytes)} bytes` }
    }
    total += uncomp
    if (uncomp > maxMember) {
      maxMember = uncomp
    }
    off += 46 + nameLen + extraLen + commentLen
  }
  return { ok: true, total, maxMember }
}

/** Inflate a zip only after the uncompressed budget is checked. */
export const unzipCapped = (
  bytes: Uint8Array,
  path: string,
  cap: number = zipExpansionCapBytes
): ZipOk | ZipFail => {
  const sizes = zipUncompressedSizes(bytes)
  if (!sizes.ok) {
    return { ok: false, reason: `${path}: ${sizes.reason}` }
  }
  if (sizes.maxMember > cap || sizes.total > cap) {
    return { ok: false, reason: `${path}: zip expansion exceeds ${String(cap)} bytes` }
  }
  try {
    const unzipped = unzipSync(bytes)
    const members: Array<ZipMember> = []
    for (const [name, data] of Object.entries(unzipped)) {
      if (data !== undefined) {
        members.push({ name, data })
      }
    }
    return { ok: true, members }
  } catch {
    return { ok: false, reason: `${path}: undecodable zip` }
  }
}

/** Pack members into a new in-memory zip. */
export const zipMembers = (members: ReadonlyArray<ZipMember>): Uint8Array => {
  const rec: Record<string, Uint8Array> = {}
  for (const member of members) {
    rec[member.name] = member.data
  }
  return zipSync(rec)
}
