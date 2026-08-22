import { unzipCapped, zipExpansionCapBytes, zipMembers, type ZipMember } from "./zip.js"

export type EpubFail = { readonly ok: false; readonly reason: string }

export interface EpubInspect {
  readonly present: boolean
  readonly labels: ReadonlyArray<string>
}

export interface EpubClean {
  readonly bytes: Uint8Array
  readonly labels: ReadonlyArray<string>
}

const decodeXml = (data: Uint8Array): string =>
  new TextDecoder("utf-8", { fatal: false }).decode(data)

const encodeXml = (text: string): Uint8Array => new TextEncoder().encode(text)

const CREATOR_RE = /<dc:creator\b[^>]*>(.*?)<\/dc:creator\s*>/gius
const ROOTFILE_RE = /<rootfile\b[^>]*\bfull-path\s*=\s*["']([^"']+)["'][^>]*\/?>/iu

const hasCreatorMetadata = (xml: string): boolean => {
  CREATOR_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = CREATOR_RE.exec(xml)) !== null) {
    if ((match[1] ?? "").trim().length > 0) {
      return true
    }
  }
  return false
}

const scrubCreator = (xml: string, name: string, labels: Array<string>): string => {
  CREATOR_RE.lastIndex = 0
  return xml.replace(CREATOR_RE, (_m, inner: string) => {
    if (inner.trim().length > 0) {
      labels.push(`${name}:dc:creator`)
    }
    return `<dc:creator></dc:creator>`
  })
}

/** Resolve the package OPF path from container.xml or a `.opf` member. */
export const resolveOpfPath = (members: ReadonlyArray<ZipMember>): string | undefined => {
  const container = members.find((m) => m.name === "META-INF/container.xml")
  if (container !== undefined) {
    const match = ROOTFILE_RE.exec(decodeXml(container.data))
    const path = match?.[1]
    if (path !== undefined && members.some((m) => m.name === path)) {
      return path
    }
  }
  const opf = members.find((m) => m.name.endsWith(".opf"))
  return opf?.name
}

/** Inspect EPUB OPF creator metadata under the zip expansion cap. */
export const inspectEpub = (
  bytes: Uint8Array,
  path: string,
  cap: number = zipExpansionCapBytes
): ({ readonly ok: true } & EpubInspect) | EpubFail => {
  const unzipped = unzipCapped(bytes, path, cap)
  if (!unzipped.ok) {
    return unzipped
  }
  const opfPath = resolveOpfPath(unzipped.members)
  if (opfPath === undefined) {
    return { ok: true, present: false, labels: [] }
  }
  const opf = unzipped.members.find((m) => m.name === opfPath)
  if (opf === undefined) {
    return { ok: true, present: false, labels: [] }
  }
  const text = decodeXml(opf.data)
  if (hasCreatorMetadata(text)) {
    return { ok: true, present: true, labels: [opfPath] }
  }
  return { ok: true, present: false, labels: [] }
}

/** Scrub EPUB OPF dc:creator under the zip expansion cap. */
export const cleanEpub = (
  bytes: Uint8Array,
  path: string,
  cap: number = zipExpansionCapBytes
): ({ readonly ok: true } & EpubClean) | EpubFail => {
  const unzipped = unzipCapped(bytes, path, cap)
  if (!unzipped.ok) {
    return unzipped
  }
  const opfPath = resolveOpfPath(unzipped.members)
  const labels: Array<string> = []
  const kept: Array<ZipMember> = []
  for (const member of unzipped.members) {
    let data = member.data
    if (opfPath !== undefined && member.name === opfPath) {
      data = encodeXml(scrubCreator(decodeXml(data), member.name, labels))
    }
    kept.push({ name: member.name, data })
  }
  return { ok: true, bytes: zipMembers(kept), labels }
}

export { unzipCapped, zipExpansionCapBytes, zipMembers }
export type { ZipMember }
