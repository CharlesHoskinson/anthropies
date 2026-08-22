import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import {
  CapabilityManifest,
  defaultNativeLimits,
  RunContext
} from "../src/core/capability.js"

const layerA = {
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

const validRunContext = {
  operation: "inspect" as const,
  forceText: false,
  json: true,
  requireCapability: [] as ReadonlyArray<string>,
  kernelApiVersion: "1.0.0" as const
}

describe("core_capability", () => {
  it("round-trips anthropies.layer-a manifest", () => {
    const decoded = Schema.decodeUnknownSync(CapabilityManifest)(layerA)
    expect(decoded.id).toBe("anthropies.layer-a")
    expect(decoded.channel).toBe("deterministic")
    expect(decoded.operations).toEqual(["inspect", "remove"])
    expect(decoded.distribution).toBe("core")
    expect(decoded.license).toBe("apache-2.0")
  })

  it("rejects a manifest missing channel", () => {
    const { channel: _c, ...rest } = layerA
    expect(() => Schema.decodeUnknownSync(CapabilityManifest)(rest)).toThrow()
  })

  it("rejects a manifest missing kernelApiMin", () => {
    const { kernelApiMin: _k, ...rest } = layerA
    expect(() => Schema.decodeUnknownSync(CapabilityManifest)(rest)).toThrow()
  })

  it("rejects a manifest missing kernelApiMax", () => {
    const { kernelApiMax: _k, ...rest } = layerA
    expect(() => Schema.decodeUnknownSync(CapabilityManifest)(rest)).toThrow()
  })

  it("rejects score on CapabilityManifest with default parse options", () => {
    expect(() => Schema.decodeUnknownSync(CapabilityManifest)({ ...layerA, score: 0.1 })).toThrow()
  })

  it("exports defaultNativeLimits", () => {
    expect(defaultNativeLimits.timeoutMs).toBe(30000)
    expect(defaultNativeLimits.memoryBytes).toBe(536870912)
    expect(defaultNativeLimits.inputSizeBytes).toBe(268435456)
    expect(defaultNativeLimits.outputSizeBytes).toBe(268435456)
    expect(defaultNativeLimits.concurrency).toBe(1)
  })

  it("decodes RunContext kernelApiVersion 1.0.0", () => {
    const ctx = Schema.decodeUnknownSync(RunContext)(validRunContext)
    expect(ctx.kernelApiVersion).toBe("1.0.0")
  })

  it("rejects extra keys on RunContext with default parse options", () => {
    expect(() => Schema.decodeUnknownSync(RunContext)({ ...validRunContext, extra: 1 })).toThrow()
    expect(() => Schema.decodeUnknownSync(RunContext)({ ...validRunContext, score: 0.1 })).toThrow()
  })
})
