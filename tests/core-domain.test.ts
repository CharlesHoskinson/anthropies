import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import { createHash } from "node:crypto"
import {
  Artifact,
  Availability,
  CapabilityFailure,
  kernelApiVersion,
  KernelFinding,
  makeArtifact,
  MarkClass,
  Removal,
  TransformResult
} from "../src/core/domain.js"
import { OfficialFinding } from "../src/report.js"

describe("core_domain", () => {
  it("exports kernelApiVersion 1.0.0", () => {
    expect(kernelApiVersion).toBe("1.0.0")
  })

  it("round-trips Artifact bytes as base64 and recovers digest", () => {
    const bytes = new TextEncoder().encode("owned output")
    const artifact = makeArtifact(bytes, "text", { name: "owned.txt", suffix: ".txt" })
    const encoded = Schema.encodeSync(Artifact)(artifact)
    const decoded = Schema.decodeUnknownSync(Artifact)(encoded)
    expect(decoded.kind).toBe("text")
    expect(decoded.bytes.length).toBe(bytes.length)
    expect(decoded.digest).toBe(createHash("sha256").update(bytes).digest("hex"))
    expect(decoded.digest).not.toMatch(/^sha256:/)
  })

  it("rejects forbidden score on OfficialFinding without editing report.ts", () => {
    expect(() =>
      Schema.decodeUnknownSync(OfficialFinding)(
        { _tag: "Unavailable", score: 0.9 },
        { onExcessProperty: "error" }
      )
    ).toThrow()
  })

  it("rejects watermarkScore on KernelFinding", () => {
    const sample = Schema.decodeUnknownSync(KernelFinding)({
      channel: "deterministic",
      markClass: "agent-trailer",
      status: "present",
      evidence: { kind: "contract" },
      packId: "anthropies.layer-a",
      packImplementationVersion: "0.4.0"
    })
    expect(sample.channel).toBe("deterministic")
    expect(() =>
      Schema.decodeUnknownSync(KernelFinding)(
        { ...sample, watermarkScore: 1 },
        { onExcessProperty: "error" }
      )
    ).toThrow()
  })

  it("decodes MarkClass literals and Availability", () => {
    expect(Schema.decodeUnknownSync(MarkClass)("invisible-unicode")).toBe("invisible-unicode")
    const a = Schema.decodeUnknownSync(Availability)({
      status: "unavailable",
      reason: "env-unset",
      detail: "ANTHROPIC_DETECT_URL unset"
    })
    expect(a.status).toBe("unavailable")
  })

  it("CapabilityFailure is tagged", () => {
    const err = new CapabilityFailure({
      code: "incompatible",
      packId: "x",
      reason: "kernel-mismatch"
    })
    expect(err._tag).toBe("CapabilityFailure")
    expect(err.code).toBe("incompatible")
  })
})
