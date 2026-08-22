import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import { createHash } from "node:crypto"
import {
  Artifact,
  Availability,
  CapabilityFailure,
  Evidence,
  kernelApiVersion,
  KernelFinding,
  makeArtifact,
  MarkClass,
  Removal,
  TransformResult
} from "../src/core/domain.js"

const validFinding = {
  channel: "deterministic" as const,
  markClass: "agent-trailer" as const,
  status: "present" as const,
  evidence: { kind: "contract" as const },
  packId: "anthropies.layer-a",
  packImplementationVersion: "0.4.0"
}

const validAvailability = {
  status: "unavailable" as const,
  reason: "env-unset" as const,
  detail: "ANTHROPIC_DETECT_URL unset"
}

const validEvidence = { kind: "contract" as const }

const validRemoval = {
  channel: "deterministic" as const,
  markClass: "agent-trailer" as const,
  changedScope: "text-layer" as const,
  evidence: validEvidence,
  labels: ["trailer"]
}

const validFailure = {
  _tag: "CapabilityFailure" as const,
  code: "decode" as const,
  packId: "x",
  reason: "malformed-output" as const
}

describe("core_domain", () => {
  it("exports kernelApiVersion 1.0.0", () => {
    expect(kernelApiVersion).toBe("1.0.0")
  })

  it("round-trips Artifact bytes as base64 and recovers digest", () => {
    const bytes = new TextEncoder().encode("owned output")
    const artifact = makeArtifact(bytes, "text", { name: "owned.txt", suffix: ".txt" })
    const encoded = Schema.encodeSync(Artifact)(artifact)
    expect(typeof (encoded as { bytes: unknown }).bytes).toBe("string")
    const decoded = Schema.decodeUnknownSync(Artifact)(encoded)
    expect(decoded.kind).toBe("text")
    expect(Array.from(decoded.bytes)).toEqual(Array.from(bytes))
    expect(decoded.digest).toBe(createHash("sha256").update(bytes).digest("hex"))
    expect(decoded.digest).not.toMatch(/^sha256:/)
  })

  it("copies bytes so caller mutation cannot change the artifact", () => {
    const bytes = new Uint8Array([1, 2, 3, 4])
    const artifact = makeArtifact(bytes, "text")
    bytes[0] = 9
    expect(artifact.bytes[0]).toBe(1)
    expect(artifact.digest).toBe(createHash("sha256").update(new Uint8Array([1, 2, 3, 4])).digest("hex"))
  })

  it("rejects mismatched and prefixed digests", () => {
    const bytes = new TextEncoder().encode("owned output")
    const b64 = Buffer.from(bytes).toString("base64")
    const good = createHash("sha256").update(bytes).digest("hex")
    const bad = "a".repeat(64)
    expect(() =>
      Schema.decodeUnknownSync(Artifact)({ bytes: b64, kind: "text", digest: bad })
    ).toThrow()
    expect(() =>
      Schema.decodeUnknownSync(Artifact)({ bytes: b64, kind: "text", digest: `sha256:${good}` })
    ).toThrow()
  })

  it("decodes a valid KernelFinding without parse options", () => {
    const sample = Schema.decodeUnknownSync(KernelFinding)(validFinding)
    expect(sample.channel).toBe("deterministic")
  })

  it("rejects watermarkScore suspicious and score on KernelFinding with default parse options", () => {
    expect(() => Schema.decodeUnknownSync(KernelFinding)({ ...validFinding, watermarkScore: 1 })).toThrow()
    expect(() => Schema.decodeUnknownSync(KernelFinding)({ ...validFinding, suspicious: true })).toThrow()
    expect(() => Schema.decodeUnknownSync(KernelFinding)({ ...validFinding, score: 0.9 })).toThrow()
  })

  it("rejects extra keys on nested Evidence inside KernelFinding", () => {
    expect(() =>
      Schema.decodeUnknownSync(KernelFinding)({
        ...validFinding,
        evidence: { kind: "contract", extra: 1 }
      })
    ).toThrow()
  })

  it("decodes MarkClass literals and Availability", () => {
    expect(Schema.decodeUnknownSync(MarkClass)("invisible-unicode")).toBe("invisible-unicode")
    const a = Schema.decodeUnknownSync(Availability)(validAvailability)
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

  it("rejects extra keys on Artifact Availability Evidence Removal TransformResult CapabilityFailure", () => {
    const bytes = new TextEncoder().encode("owned output")
    const artifact = makeArtifact(bytes, "text")
    const encodedArt = Schema.encodeSync(Artifact)(artifact)
    expect(() => Schema.decodeUnknownSync(Artifact)({ ...encodedArt, extra: 1 })).toThrow()
    expect(() => Schema.decodeUnknownSync(Availability)({ ...validAvailability, extra: 1 })).toThrow()
    expect(() => Schema.decodeUnknownSync(Evidence)({ ...validEvidence, extra: 1 })).toThrow()
    expect(() => Schema.decodeUnknownSync(Removal)({ ...validRemoval, extra: 1 })).toThrow()
    const encodedRemoval = Schema.encodeSync(Removal)(Schema.decodeUnknownSync(Removal)(validRemoval))
    const encodedFinding = Schema.encodeSync(KernelFinding)(Schema.decodeUnknownSync(KernelFinding)(validFinding))
    expect(() =>
      Schema.decodeUnknownSync(TransformResult)({
        artifact: encodedArt,
        removals: [encodedRemoval],
        evidence: validEvidence,
        residualFindings: [encodedFinding],
        warnings: [],
        remediation: "unchanged",
        extra: 1
      })
    ).toThrow()
    expect(() => Schema.decodeUnknownSync(CapabilityFailure)({ ...validFailure, extra: 1 })).toThrow()
    expect(Schema.decodeUnknownSync(Evidence)(validEvidence).kind).toBe("contract")
    expect(Schema.decodeUnknownSync(Removal)(validRemoval).changedScope).toBe("text-layer")
    expect(Schema.decodeUnknownSync(CapabilityFailure)(validFailure).code).toBe("decode")
    const tr = Schema.decodeUnknownSync(TransformResult)({
      artifact: encodedArt,
      removals: [encodedRemoval],
      evidence: validEvidence,
      residualFindings: [encodedFinding],
      warnings: [],
      remediation: "unchanged"
    })
    expect(tr.remediation).toBe("unchanged")
  })
})
