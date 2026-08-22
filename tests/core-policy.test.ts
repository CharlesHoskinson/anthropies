import { readFileSync } from "node:fs"
import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import { CapabilityManifest, defaultNativeLimits } from "../src/core/capability.js"
import {
  fileCapBytes,
  isCertificationChannel,
  isCertificationFailClosed,
  isOptionalFailSoft,
  selectOwner,
  shouldPreserveOriginal,
  zipExpansionCapBytes
} from "../src/core/policy.js"
import { fileCapBytes as registryFileCapBytes } from "../src/formats/registry.js"
import { zipExpansionCapBytes as zipFileCapBytes } from "../src/formats/zip.js"

const layerAInput = {
  id: "anthropies.layer-a",
  displayName: "Layer A",
  kernelApiMin: "1.0.0",
  kernelApiMax: "1.0.0",
  apiVersion: "1.0.0",
  implementationVersion: "0.4.0",
  artifactKinds: ["text", "svg", "html", "md", "docx", "odt"],
  markClasses: ["invisible-unicode", "agent-trailer", "generated-banner"],
  operations: ["inspect", "remove"],
  channel: "deterministic",
  priority: 100,
  ordering: {},
  runtime: "native-ts",
  network: "none",
  privacy: "local-only",
  limits: defaultNativeLimits,
  license: "apache-2.0",
  distribution: "core"
} as const

const decodeManifest = (input: unknown): CapabilityManifest =>
  Schema.decodeUnknownSync(CapabilityManifest)(input)

const layerA = decodeManifest(layerAInput)

const optionalDetector = decodeManifest({
  ...layerAInput,
  id: "anthropies.optional-detector",
  displayName: "Optional detector",
  distribution: "optional",
  channel: "statistical",
  markClasses: ["keyed-text"],
  operations: ["inspect", "score"]
})

const textRemove = {
  artifactKind: "text" as const,
  markClass: "invisible-unicode" as const,
  operation: "remove" as const
}

describe("core_policy", () => {
  it("optional pack is fail-soft unless required", () => {
    expect(isOptionalFailSoft(optionalDetector, [])).toBe(true)
    expect(isOptionalFailSoft(optionalDetector, ["anthropies.optional-detector"])).toBe(false)
    expect(isOptionalFailSoft(layerA, [])).toBe(false)
    expect(isOptionalFailSoft(layerA, ["anthropies.layer-a"])).toBe(false)
  })

  it("certification channels are only deterministic and c2pa", () => {
    expect(isCertificationChannel("deterministic")).toBe(true)
    expect(isCertificationChannel("c2pa")).toBe(true)
    expect(isCertificationChannel("statistical")).toBe(false)
    expect(isCertificationChannel("official")).toBe(false)
  })

  it("certification protocol mismatch is fail-closed", () => {
    expect(isCertificationFailClosed("deterministic", "protocol-mismatch")).toBe(true)
    expect(isCertificationFailClosed("deterministic", "kernel-mismatch")).toBe(true)
    expect(isCertificationFailClosed("c2pa", "kernel-mismatch")).toBe(true)
    expect(isCertificationFailClosed("c2pa", "protocol-mismatch")).toBe(true)
    expect(isCertificationFailClosed("statistical", "protocol-mismatch")).toBe(false)
    expect(isCertificationFailClosed("official", "kernel-mismatch")).toBe(false)
    const notMismatch = [
      "timeout",
      "malformed-output",
      "conflict",
      "probe-failed",
      "resource-exceeded",
      "ready",
      "optional-absent"
    ] as const
    for (const reason of notMismatch) {
      expect(isCertificationFailClosed("deterministic", reason)).toBe(false)
      expect(isCertificationFailClosed("c2pa", reason)).toBe(false)
    }
  })

  it("preserves original on uncertainty reasons only", () => {
    expect(shouldPreserveOriginal("timeout")).toBe(true)
    expect(shouldPreserveOriginal("malformed-output")).toBe(true)
    expect(shouldPreserveOriginal("conflict")).toBe(true)
    expect(shouldPreserveOriginal("probe-failed")).toBe(true)
    expect(shouldPreserveOriginal("resource-exceeded")).toBe(true)
    expect(shouldPreserveOriginal("ready")).toBe(false)
    expect(shouldPreserveOriginal("optional-absent")).toBe(false)
    expect(shouldPreserveOriginal("kernel-mismatch")).toBe(false)
    expect(shouldPreserveOriginal("protocol-mismatch")).toBe(false)
  })

  it("selectOwner returns conflict for two claimants of the same tuple", () => {
    const dup = decodeManifest({ ...layerAInput, id: "anthropies.layer-a-dup" })
    expect(selectOwner([layerA, dup], textRemove)).toEqual({ ok: false, code: "conflict" })
  })

  it("selectOwner returns the single claimant", () => {
    const result = selectOwner([layerA, optionalDetector], textRemove)
    expect(result).toEqual({ ok: true, owner: layerA })
  })

  it("selectOwner returns none when nobody claims the tuple", () => {
    expect(selectOwner([optionalDetector], textRemove)).toEqual({ ok: false, code: "none" })
    expect(selectOwner([], textRemove)).toEqual({ ok: false, code: "none" })
  })

  it("empty artifactKinds creates no owner claim", () => {
    const emptyKinds = decodeManifest({ ...layerAInput, id: "anthropies.empty-kinds", artifactKinds: [] })
    expect(selectOwner([emptyKinds, layerA], textRemove)).toEqual({ ok: true, owner: layerA })
    expect(selectOwner([emptyKinds], textRemove)).toEqual({ ok: false, code: "none" })
  })

  it("selectOwner requires kind and markClass and operation", () => {
    const wrongKind = decodeManifest({ ...layerAInput, id: "anthropies.wrong-kind", artifactKinds: ["pdf"] })
    const wrongMark = decodeManifest({
      ...layerAInput,
      id: "anthropies.wrong-mark",
      markClasses: ["pixel"]
    })
    const wrongOp = decodeManifest({
      ...layerAInput,
      id: "anthropies.wrong-op",
      operations: ["inspect"]
    })
    expect(selectOwner([wrongKind], textRemove)).toEqual({ ok: false, code: "none" })
    expect(selectOwner([wrongMark], textRemove)).toEqual({ ok: false, code: "none" })
    expect(selectOwner([wrongOp], textRemove)).toEqual({ ok: false, code: "none" })
  })

  it("re-exports existing byte caps without new literals", () => {
    expect(fileCapBytes).toBe(registryFileCapBytes)
    expect(zipExpansionCapBytes).toBe(zipFileCapBytes)
    const src = readFileSync("src/core/policy.ts", "utf8")
    expect(src).toMatch(/from "\.\.\/formats\/registry\.js"/)
    expect(src).toMatch(/from "\.\.\/formats\/zip\.js"/)
    expect(src).not.toMatch(/256 \* 1024 \* 1024/)
    expect(src).not.toMatch(/128 \* 1024 \* 1024/)
    expect(src).not.toMatch(/268435456/)
    expect(src).not.toMatch(/134217728/)
  })
})
