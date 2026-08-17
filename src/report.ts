import { Schema } from "effect"
import { Kind } from "./kind.js"

/** Detect channel. Adapters never share a number. */
export const Channel = Schema.Literal("deterministic", "c2pa", "official", "statistical")
export type Channel = typeof Channel.Type

/** Finding status verbs. MissingTool is a Finding, never a Fail. */
export const FindingStatus = Schema.Literal(
  "present",
  "absent",
  "unavailable",
  "best-effort",
  "degraded"
)
export type FindingStatus = typeof FindingStatus.Type

/** Per-channel finding on the success path. */
export class Finding extends Schema.Class<Finding>("Finding")({
  channel: Channel,
  status: FindingStatus
}) {}

/** Items stripped on one channel. Nested per channel, never mixed. */
export const ChannelRemoved = Schema.Array(Schema.String)
export type ChannelRemoved = typeof ChannelRemoved.Type

/** Per-channel removals. Never a flat mixed bag. */
export class Removed extends Schema.Class<Removed>("Removed")({
  deterministic: Schema.optionalWith(ChannelRemoved, { exact: true }),
  c2pa: Schema.optionalWith(ChannelRemoved, { exact: true }),
  official: Schema.optionalWith(ChannelRemoved, { exact: true }),
  statistical: Schema.optionalWith(ChannelRemoved, { exact: true })
}) {}

/** Official adapter is unset. No score field. */
export class OfficialUnavailable extends Schema.TaggedClass<OfficialUnavailable>()(
  "Unavailable",
  {}
) {}

/** Official adapter returned a vendor payload. Report raw, never paraphrase. */
export class OfficialAvailable extends Schema.TaggedClass<OfficialAvailable>()("Available", {
  url: Schema.String,
  raw: Schema.Unknown
}) {}

/** Official text-detect adapter result. Unset URL is Unavailable. */
export const OfficialFinding = Schema.Union(OfficialUnavailable, OfficialAvailable)
export type OfficialFinding = typeof OfficialFinding.Type

/** 5-gram rewrite overlap. Not a watermark score. */
export class RewriteMetric extends Schema.Class<RewriteMetric>("RewriteMetric")({
  ngram: Schema.Literal(5),
  tokenizer: Schema.Literal("unicode-words"),
  surviving_ratio: Schema.NullOr(Schema.Number),
  n: Schema.Number,
  domain: Schema.Literal("prose", "code", "unknown"),
  status: Schema.Literal("computed", "insufficient", "not-run")
}) {}

/** Encoded only at the CLI edge. No suspicious, no mixed score. */
export class Report extends Schema.Class<Report>("Report")({
  kind: Kind,
  findings: Schema.Array(Finding),
  removed: Removed,
  anyDeterministicHits: Schema.optionalWith(Schema.Boolean, { exact: true }),
  degraded: Schema.Boolean,
  honesty: Schema.Array(Schema.String),
  rewrite_metric: Schema.optionalWith(RewriteMetric, { exact: true }),
  official: Schema.optionalWith(OfficialFinding, { exact: true })
}) {}

export interface HonestyStanzaInput {
  readonly official: string
  readonly c2pa: string
  readonly deterministic: string
  readonly statistical: string
}

/** Locked honesty stanza for human stderr and JSON honesty. */
export const honestyStanza = (input: HonestyStanzaInput): Array<string> => [
  `official text detector: ${input.official}`,
  `c2pa: ${input.c2pa}`,
  `deterministic: ${input.deterministic}`,
  `statistical: best-effort; surviving 5-gram ratio=${input.statistical}; not an official-detector certificate`,
  "this run does not prove the official Claude text detector will fail",
  "this run does not prove the text is human-written",
  "absence of a mark does not prove Claude was uninvolved"
]

/** Soft-binding residual. Always appended on raster reports. */
export const softBindingSentence = "soft-binding and pixel marks are out of scope"

/** Certificate residual drives exit 1 unless the run is degraded. */
export const residualDrivesExit = (report: {
  readonly degraded: boolean
  readonly findings: ReadonlyArray<{ readonly channel: string; readonly status: string }>
}): boolean =>
  !report.degraded &&
  report.findings.some(
    (f) => (f.channel === "deterministic" || f.channel === "c2pa") && f.status === "present"
  )
