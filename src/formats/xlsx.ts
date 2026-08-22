import {
  cleanOoxmlDocProps,
  inspectOoxmlDocProps,
  type OoxmlClean,
  type OoxmlFail,
  type OoxmlInspect,
  zipExpansionCapBytes
} from "./ooxml.js"

/** Inspect XLSX docProps generator metadata under the zip expansion cap. */
export const inspectXlsx = (
  bytes: Uint8Array,
  path: string,
  cap: number = zipExpansionCapBytes
): ({ readonly ok: true } & OoxmlInspect) | OoxmlFail => inspectOoxmlDocProps(bytes, path, cap)

/** Scrub XLSX docProps provenance fields under the zip expansion cap. */
export const cleanXlsx = (
  bytes: Uint8Array,
  path: string,
  cap: number = zipExpansionCapBytes
): ({ readonly ok: true } & OoxmlClean) | OoxmlFail => cleanOoxmlDocProps(bytes, path, cap)
