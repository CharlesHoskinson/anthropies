import { unzipCapped, zipExpansionCapBytes, zipMembers, type ZipMember } from "./zip.js"

/** Shared OOXML docProps / customXml scrub field names. */
export const OOXML_SCRUB_FIELDS = [
  "dc:creator",
  "cp:lastModifiedBy",
  "dc:description",
  "cp:keywords",
  "dc:subject",
  "cp:category",
  "Application",
  "AppVersion",
  "Company",
  "Manager"
] as const

export type OoxmlFail = { readonly ok: false; readonly reason: string }

export interface OoxmlInspect {
  readonly present: boolean
  readonly labels: ReadonlyArray<string>
}

export interface OoxmlClean {
  readonly bytes: Uint8Array
  readonly labels: ReadonlyArray<string>
}

export const decodeXml = (data: Uint8Array): string =>
  new TextDecoder("utf-8", { fatal: false }).decode(data)

export const encodeXml = (text: string): Uint8Array => new TextEncoder().encode(text)

/** True for docProps/ and customXml/ package parts. */
export const isOoxmlMetaPart = (name: string): boolean =>
  name.startsWith("docProps/") || name.startsWith("customXml/")

/** Empty inner text for known provenance scrub fields; push labels when non-empty. */
export const scrubOoxmlFields = (xml: string, name: string, labels: Array<string>): string => {
  let out = xml
  for (const tag of OOXML_SCRUB_FIELDS) {
    const re = new RegExp(`(<${tag}\\b[^>]*>)(.*?)(</${tag}>)`, "gius")
    out = out.replace(re, (_m, open: string, inner: string, close: string) => {
      if (inner.length > 0) {
        labels.push(`${name}:${tag}`)
      }
      return `${open}${close}`
    })
  }
  return out
}

const GENERATOR_FIELD_RE =
  /<(dc:creator|Application)\b[^>]*>(.*?)<\/\1\s*>/gius

/** True when docProps core/app XML has non-empty dc:creator or Application. */
export const hasGeneratorMetadata = (xml: string): boolean => {
  GENERATOR_FIELD_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = GENERATOR_FIELD_RE.exec(xml)) !== null) {
    if ((match[2] ?? "").length > 0) {
      return true
    }
  }
  return false
}

/** Inspect capped zip members for generator metadata in docProps. */
export const inspectOoxmlDocProps = (
  bytes: Uint8Array,
  path: string,
  cap: number = zipExpansionCapBytes
): ({ readonly ok: true } & OoxmlInspect) | OoxmlFail => {
  const unzipped = unzipCapped(bytes, path, cap)
  if (!unzipped.ok) {
    return unzipped
  }
  const labels: Array<string> = []
  for (const member of unzipped.members) {
    if (member.name !== "docProps/core.xml" && member.name !== "docProps/app.xml") {
      continue
    }
    const text = decodeXml(member.data)
    if (hasGeneratorMetadata(text)) {
      labels.push(member.name)
    }
  }
  return { ok: true, present: labels.length > 0, labels }
}

/** Scrub docProps fields and drop customXml / custom.xml under the zip cap. */
export const cleanOoxmlDocProps = (
  bytes: Uint8Array,
  path: string,
  cap: number = zipExpansionCapBytes
): ({ readonly ok: true } & OoxmlClean) | OoxmlFail => {
  const unzipped = unzipCapped(bytes, path, cap)
  if (!unzipped.ok) {
    return unzipped
  }
  const labels: Array<string> = []
  const kept: Array<ZipMember> = []
  for (const member of unzipped.members) {
    if (member.name.startsWith("customXml/") || member.name === "docProps/custom.xml") {
      labels.push(`drop:${member.name}`)
      continue
    }
    let data = member.data
    if (member.name.startsWith("docProps/")) {
      data = encodeXml(scrubOoxmlFields(decodeXml(data), member.name, labels))
    }
    kept.push({ name: member.name, data })
  }
  return { ok: true, bytes: zipMembers(kept), labels }
}

export { unzipCapped, zipExpansionCapBytes, zipMembers }
export type { ZipMember }
