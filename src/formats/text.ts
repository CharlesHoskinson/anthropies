import { Effect } from "effect"
import { DecodeError } from "../fail.js"
import { applyLayerA, type LayerARemoved } from "../layer-a.js"

export interface TextCleanResult {
  readonly bytes: Uint8Array
  readonly text: string
  readonly removed: LayerARemoved
}

/** Decode owned bytes as UTF-8. force-text uses replacement, not fatal. */
export const decodeUtf8 = (
  path: string,
  bytes: Uint8Array,
  forceText: boolean
): Effect.Effect<string, DecodeError> =>
  Effect.try({
    try: () => new TextDecoder("utf-8", { fatal: !forceText }).decode(bytes),
    catch: () => new DecodeError({ path, reason: "undecodable as utf-8" })
  })

/** Apply Layer A and re-encode UTF-8. */
export const cleanText = (text: string): TextCleanResult => {
  const result = applyLayerA(text)
  return {
    bytes: new TextEncoder().encode(result.text),
    text: result.text,
    removed: result.removed
  }
}
