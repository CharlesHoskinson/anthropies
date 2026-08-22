import { Schema } from "effect"

export const sidecarProtocolVersion = "1.0.0" as const

const excessPropertyError = {
  parseOptions: { onExcessProperty: "error" as const }
}

const Sha256Hex = Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/))

// Empty Struct ignores onExcessProperty; filter rejects any keys (including score).
const EmptyObject = Schema.Struct({}).pipe(
  Schema.filter((u) => Object.keys(u).length === 0, {
    message: () => "expected empty object"
  })
)

const Artifact = Schema.Struct({
  bytes: Schema.Uint8ArrayFromBase64,
  kind: Schema.Literal("text"),
  digest: Sha256Hex
}).annotations(excessPropertyError)

export const isLoopbackBaseUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url)
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost")
    )
  } catch {
    return false
  }
}

export const isManagedBlobPath = (path: string): boolean =>
  path.startsWith("/tmp/anthropies-sidecar/") && !path.includes("..")

export class SidecarHealth extends Schema.Class<SidecarHealth>("SidecarHealth")(
  {
    protocolVersion: Schema.Literal(sidecarProtocolVersion),
    ok: Schema.Literal(true)
  },
  [undefined, undefined, excessPropertyError]
) {}

export class SidecarCapabilities extends Schema.Class<SidecarCapabilities>("SidecarCapabilities")(
  {
    protocolVersion: Schema.Literal(sidecarProtocolVersion),
    id: Schema.String,
    kernelApiMin: Schema.String,
    kernelApiMax: Schema.String,
    operations: Schema.Array(Schema.String)
  },
  [undefined, undefined, excessPropertyError]
) {}

export class SidecarInspectRequest extends Schema.Class<SidecarInspectRequest>(
  "SidecarInspectRequest"
)(
  {
    protocolVersion: Schema.Literal(sidecarProtocolVersion),
    operation: Schema.Literal("inspect"),
    artifact: Artifact
  },
  [undefined, undefined, excessPropertyError]
) {}

export class SidecarInspectResponse extends Schema.Class<SidecarInspectResponse>(
  "SidecarInspectResponse"
)(
  {
    protocolVersion: Schema.Literal(sidecarProtocolVersion),
    ok: Schema.Literal(true),
    packId: Schema.String,
    artifact: Artifact,
    findings: Schema.Array(EmptyObject)
  },
  [undefined, undefined, excessPropertyError]
) {}

export class SidecarTransformRequest extends Schema.Class<SidecarTransformRequest>(
  "SidecarTransformRequest"
)(
  {
    protocolVersion: Schema.Literal(sidecarProtocolVersion),
    operation: Schema.Literal("remove"),
    artifact: Artifact
  },
  [undefined, undefined, excessPropertyError]
) {}

export class SidecarTransformResponse extends Schema.Class<SidecarTransformResponse>(
  "SidecarTransformResponse"
)(
  {
    protocolVersion: Schema.Literal(sidecarProtocolVersion),
    ok: Schema.Literal(true),
    packId: Schema.String,
    artifact: Artifact,
    removals: Schema.Array(EmptyObject)
  },
  [undefined, undefined, excessPropertyError]
) {}

export class SidecarError extends Schema.Class<SidecarError>("SidecarError")(
  {
    protocolVersion: Schema.Literal(sidecarProtocolVersion),
    ok: Schema.Literal(false),
    code: Schema.Literal(
      "timeout",
      "malformed-output",
      "incompatible",
      "unavailable",
      "resource-exceeded"
    )
  },
  [undefined, undefined, excessPropertyError]
) {}
