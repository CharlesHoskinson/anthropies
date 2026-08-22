import {
  cleanOoxmlDocProps,
  inspectOoxmlDocProps,
  type OoxmlClean,
  type OoxmlFail,
  type OoxmlInspect,
  zipExpansionCapBytes
} from "./ooxml.js"

/** Inspect PPTX docProps generator metadata under the zip expansion cap. */
export const inspectPptx = (
  bytes: Uint8Array,
  path: string,
  cap: number = zipExpansionCapBytes
): ({ readonly ok: true } & OoxmlInspect) | OoxmlFail => inspectOoxmlDocProps(bytes, path, cap)

/** Scrub PPTX docProps provenance fields under the zip expansion cap. */
export const cleanPptx = (
  bytes: Uint8Array,
  path: string,
  cap: number = zipExpansionCapBytes
): ({ readonly ok: true } & OoxmlClean) | OoxmlFail => cleanOoxmlDocProps(bytes, path, cap)
