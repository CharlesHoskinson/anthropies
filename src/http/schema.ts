import { Either, Encoding, Schema } from "effect"
import { Availability, kernelApiVersion } from "../core/domain.js"
import { DecodeError, InputTooLarge } from "../fail.js"
import { fileCapBytes } from "../formats/registry.js"
import { Kind } from "../kind.js"
import { Report } from "../report.js"

/** Package version this wave ships. */
export const serviceVersion = "0.3.0" as const

/** Max base64 characters for a decoded payload of `cap` bytes, plus padding slack. */
export const maxEncodedChars = (cap: number): number => Math.ceil(cap / 3) * 4 + 16

/** Decode request `file` and refuse over-cap or invalid base64. */
export const decodeRequestFile = (
  file: string,
  cap = fileCapBytes
): Either.Either<Uint8Array, DecodeError | InputTooLarge> => {
  if (file.length > maxEncodedChars(cap)) {
    return Either.left(
      new InputTooLarge({ path: "<request>", reason: `file exceeds ${String(cap)} bytes` })
    )
  }
  const decoded = Encoding.decodeBase64(file)
  if (Either.isLeft(decoded)) {
    return Either.left(
      new DecodeError({ path: "<request>", reason: decoded.left.message ?? "invalid base64" })
    )
  }
  if (decoded.right.length > cap) {
    return Either.left(
      new InputTooLarge({ path: "<request>", reason: `file exceeds ${String(cap)} bytes` })
    )
  }
  return Either.right(decoded.right)
}

/** Optional inspect/clean flags. */
export class FileOptions extends Schema.Class<FileOptions>("FileOptions")({
  forceText: Schema.optionalWith(Schema.Boolean, { exact: true })
}) {}

/** JSON body for POST /inspect and POST /clean. */
export class FileRequest extends Schema.Class<FileRequest>("FileRequest")({
  file: Schema.String,
  name: Schema.String,
  options: Schema.optionalWith(FileOptions, { exact: true })
}) {}

/** GET /health. */
export class HealthResponse extends Schema.Class<HealthResponse>("HealthResponse")({
  ok: Schema.Literal(true),
  version: Schema.Literal(serviceVersion)
}) {}

/** GET /capabilities tool probes. */
export class ToolPresence extends Schema.Class<ToolPresence>("ToolPresence")({
  qpdf: Schema.Boolean,
  exiftool: Schema.Boolean,
  c2patool: Schema.Boolean
}) {}

/** GET /capabilities scorer flags. Official is a presence bit, not a score. */
export class ScorerPresence extends Schema.Class<ScorerPresence>("ScorerPresence")({
  officialDetect: Schema.Boolean
}) {}

/** One pack row on GET /capabilities. No score field. */
export class PackCapabilityView extends Schema.Class<PackCapabilityView>("PackCapabilityView")({
  id: Schema.String,
  implementationVersion: Schema.String,
  availability: Availability,
  license: Schema.String,
  privacy: Schema.String,
  network: Schema.String,
  artifactKinds: Schema.Array(Kind),
  operations: Schema.Array(Schema.String)
}) {}

/** GET /capabilities. */
export class CapabilitiesResponse extends Schema.Class<CapabilitiesResponse>("CapabilitiesResponse")({
  version: Schema.Literal(serviceVersion),
  kernelApiVersion: Schema.Literal(kernelApiVersion),
  tools: ToolPresence,
  scorers: ScorerPresence,
  packs: Schema.Array(PackCapabilityView)
}) {}

/** POST /inspect success body. Honesty stays on report.honesty. */
export class InspectResponse extends Schema.Class<InspectResponse>("InspectResponse")({
  ok: Schema.Boolean,
  kind: Kind,
  report: Report
}) {}

/** POST /clean success body. cleaned is base64 of cleaned bytes. */
export class CleanResponse extends Schema.Class<CleanResponse>("CleanResponse")({
  ok: Schema.Boolean,
  kind: Kind,
  report: Report,
  cleaned: Schema.Uint8ArrayFromBase64
}) {}
