import {
  Evidence,
  KernelFinding,
  type Artifact,
  type KernelFindingStatus
} from "../core/domain.js"
import type { SidecarInspectResponse } from "./protocol.js"
import { sidecarProtocolVersion } from "./protocol.js"

export const CTRLREGEN_PACK_ID = "anthropies.ctrlregen"
export const CTRLREGEN_PACK_VERSION = "0.1.0"
export const CTRLREGEN_FINGERPRINT = "ctrlregen-method:config=residual-v1"

/** Sidecar wire protocol version used by CtrlRegen-method inspect. */
export const ctrlRegenSidecarProtocolVersion = sidecarProtocolVersion

export const mapCtrlRegenInspectFindings = (
  response: SidecarInspectResponse,
  artifact: Artifact
): ReadonlyArray<KernelFinding> => {
  const status: KernelFindingStatus = response.findings.length === 0 ? "absent" : "present"
  return [
    new KernelFinding({
      channel: "statistical",
      markClass: "pixel",
      status,
      evidence: new Evidence({
        kind: "empirical",
        versionFingerprint: CTRLREGEN_FINGERPRINT,
        rawReference: artifact.digest
      }),
      packId: CTRLREGEN_PACK_ID,
      packImplementationVersion: CTRLREGEN_PACK_VERSION
    })
  ]
}
