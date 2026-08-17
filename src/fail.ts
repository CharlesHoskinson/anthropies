import { Schema } from "effect"

/** ZIP, PDF, or image bytes fed to a text command without --force-text. */
export class BinaryInput extends Schema.TaggedError<BinaryInput>()("BinaryInput", {
  path: Schema.String,
  reason: Schema.String
}) {}

/** humanize backend or model contains a blocked origin token. */
export class OriginBlocked extends Schema.TaggedError<OriginBlocked>()("OriginBlocked", {
  path: Schema.String,
  reason: Schema.String
}) {}

/** capture or demo ran without ANTHROPIC_API_KEY. */
export class MissingApiKey extends Schema.TaggedError<MissingApiKey>()("MissingApiKey", {
  path: Schema.String,
  reason: Schema.String
}) {}

/** capture or demo model ID is not on the committed allowlist. */
export class PreMarkModel extends Schema.TaggedError<PreMarkModel>()("PreMarkModel", {
  path: Schema.String,
  reason: Schema.String
}) {}

/** Truncated image, zip bomb, over budget, or undecodable container. */
export class DecodeError extends Schema.TaggedError<DecodeError>()("DecodeError", {
  path: Schema.String,
  reason: Schema.String
}) {}

/** --in-place would clobber after failed classify, or dest is a symlink. */
export class WriteGuard extends Schema.TaggedError<WriteGuard>()("WriteGuard", {
  path: Schema.String,
  reason: Schema.String
}) {}

/** File or stdin exceeds the cap enforced before a full buffer. */
export class InputTooLarge extends Schema.TaggedError<InputTooLarge>()("InputTooLarge", {
  path: Schema.String,
  reason: Schema.String
}) {}
