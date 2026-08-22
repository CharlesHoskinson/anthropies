import { readdirSync, readFileSync } from "node:fs"
import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import {
  isLoopbackBaseUrl,
  isManagedBlobPath,
  sidecarProtocolVersion,
  SidecarCapabilities,
  SidecarError,
  SidecarHealth,
  SidecarInspectRequest,
  SidecarInspectResponse,
  SidecarTransformRequest,
  SidecarTransformResponse
} from "../src/sidecars/protocol.js"

const load = (name: string): unknown =>
  JSON.parse(readFileSync(`fixtures/sidecars/v1/${name}`, "utf8")) as unknown

const goldens = [
  "health-ok.json",
  "capabilities-ok.json",
  "inspect-ok.json",
  "transform-ok.json",
  "error-timeout.json",
  "error-malformed-output.json",
  "error-incompatible.json"
] as const

describe("sidecar_protocol", () => {
  it("pins protocolVersion 1.0.0", () => {
    expect(sidecarProtocolVersion).toBe("1.0.0")
  })

  it("decodes all seven v1 goldens", () => {
    expect(readdirSync("fixtures/sidecars/v1").sort()).toEqual([...goldens].sort())
    expect(Schema.decodeUnknownSync(SidecarHealth)(load("health-ok.json")).ok).toBe(true)
    expect(Schema.decodeUnknownSync(SidecarCapabilities)(load("capabilities-ok.json")).id).toBe(
      "anthropies.layer-a"
    )
    const inspect = Schema.decodeUnknownSync(SidecarInspectResponse)(load("inspect-ok.json"))
    expect(inspect.ok).toBe(true)
    expect(inspect.packId).toBe("anthropies.layer-a")
    const transform = Schema.decodeUnknownSync(SidecarTransformResponse)(load("transform-ok.json"))
    expect(transform.ok).toBe(true)
    const artifact = {
      bytes: "b3duZWQgb3V0cHV0",
      kind: "text",
      digest: "b8078cfc621040f79f42dcd4eb598a5bf73b640e78b573eb344202696095b1c2"
    }
    expect(Schema.decodeUnknownSync(SidecarInspectRequest)({
      protocolVersion: "1.0.0",
      operation: "inspect",
      artifact
    }).operation).toBe("inspect")
    expect(Schema.decodeUnknownSync(SidecarTransformRequest)({
      protocolVersion: "1.0.0",
      operation: "remove",
      artifact
    }).operation).toBe("remove")
    expect(Schema.decodeUnknownSync(SidecarError)(load("error-timeout.json")).code).toBe("timeout")
    expect(Schema.decodeUnknownSync(SidecarError)(load("error-malformed-output.json")).code).toBe(
      "malformed-output"
    )
    expect(Schema.decodeUnknownSync(SidecarError)(load("error-incompatible.json")).code).toBe(
      "incompatible"
    )
  })

  it("rejects protocolVersion 2.0.0 on v1 inspect response", () => {
    const body = { ...(load("inspect-ok.json") as object), protocolVersion: "2.0.0" }
    expect(() => Schema.decodeUnknownSync(SidecarInspectResponse)(body)).toThrow()
  })

  it("loopback predicate accepts only 127.0.0.1 and localhost", () => {
    expect(isLoopbackBaseUrl("http://127.0.0.1:1870")).toBe(true)
    expect(isLoopbackBaseUrl("http://localhost:1870")).toBe(true)
    expect(isLoopbackBaseUrl("http://example.com")).toBe(false)
    expect(isLoopbackBaseUrl("http://10.0.0.1:1870")).toBe(false)
  })

  it("rejects score on sidecar errors", () => {
    expect(() =>
      Schema.decodeUnknownSync(SidecarError)({
        protocolVersion: "1.0.0",
        ok: false,
        code: "timeout",
        score: 0.9
      })
    ).toThrow()
    expect(() =>
      Schema.decodeUnknownSync(SidecarError)({
        protocolVersion: "1.0.0",
        ok: false,
        code: "timeout",
        watermarkScore: 1
      })
    ).toThrow()
  })

  it("managed blob paths reject parent segments", () => {
    expect(isManagedBlobPath("/tmp/anthropies-sidecar/owned.bin")).toBe(true)
    expect(isManagedBlobPath("/tmp/anthropies-sidecar/../etc/passwd")).toBe(false)
    expect(isManagedBlobPath("/tmp/other/owned.bin")).toBe(false)
  })

  it("rejects score on inspect findings", () => {
    const body = {
      protocolVersion: "1.0.0",
      ok: true,
      packId: "anthropies.layer-a",
      artifact: {
        bytes: "b3duZWQgb3V0cHV0",
        kind: "text",
        digest: "b8078cfc621040f79f42dcd4eb598a5bf73b640e78b573eb344202696095b1c2"
      },
      findings: [{ score: 0.9 }]
    }
    expect(() => Schema.decodeUnknownSync(SidecarInspectResponse)(body)).toThrow()
  })

  it("loopback predicate rejects non-http schemes", () => {
    expect(isLoopbackBaseUrl("file://localhost/tmp")).toBe(false)
    expect(isLoopbackBaseUrl("javascript:localhost")).toBe(false)
  })
})
