import { Effect } from "effect"
import { applyLayerA } from "../layer-a.js"
import { Finding } from "../report.js"

/** Deterministic Layer A findings from text. */
export const deterministicFindings = (text: string): Array<Finding> => {
  const { removed } = applyLayerA(text)
  const present = removed.unicode + removed.trailer + removed.banner > 0
  return [
    new Finding({
      channel: "deterministic",
      status: present ? "present" : "absent"
    })
  ]
}

/** Four-channel detect adapters. Official stays unavailable in this family. */
export class Detector extends Effect.Service<Detector>()("Detector", {
  accessors: true,
  succeed: {
    deterministic: deterministicFindings
  }
}) {}
