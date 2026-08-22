## Context

See proposal.md for motivation. Sprint 0 kernel, planner, and pipeline exist. Sprint 1 format packs cover single-file inspect and remove. No directory scanner, no SARIF exporter, and no website audit pack exist yet. Capability manifests already declare `operations` that may include `audit`, plus `limits.concurrency` and `network` values `none`, `loopback`, and `remote-opt-in`.

## Goals / Non-Goals

**Goals:**

- Bound directory selection by root, depth, file count, and size.
- Reuse the single-file capability planner per selected artifact.
- Keep aggregation order stable across concurrent runs.
- Emit JSON reports and channel-scoped SARIF without mixed scores.
- Keep successful findings when some targets fail.
- Require explicit opt-in for remote website audit and block SSRF classes.
- Keep health at `0.3.0` and keep the four channels unmixed.

**Non-Goals:**

- Browser rendering or JavaScript execution in pages.
- Open-ended crawl graphs without budgets.
- Hosted multi-tenant cloud operation.
- Implementing pack sources in this freeze unit.

## Decisions

### Directory pack reuses the planner

Pack id `anthropies.audit-directory` walks a configured root under explicit bounds. For each selected file it builds an `Artifact` and calls the same planner used for single-file inspect. It does not invent a second applicability matrix.

Alternative considered: one bulk pack that bypasses the planner. Rejected because ownership, probe, and channel rules would drift from single-file behavior.

### Path safety

Selected paths must resolve under the configured root after symlink evaluation policy. Paths that escape the root are refused. Hidden or unsupported kinds follow the existing classify and binary-refusal rules. Empty selection is an error.

### Deterministic concurrency

Operators may set a concurrency bound greater than one. Inflight work never exceeds that bound. Aggregation sorts results by stable relative path, then by channel, then by mark class. Completion order must not change output order.

Alternative considered: emit results as tasks finish. Rejected because SARIF and JSON diffs would flake.

### JSON and channel-scoped SARIF

JSON remains the primary machine report and keeps findings on the four channels only. SARIF is an additional export. Each SARIF run or result set is scoped to one channel. Rule ids map to actionable pack and mark-class evidence. SARIF must not invent `watermarkScore`, `suspicious`, or a blended cross-channel score.

### Partial-failure reporting

When one target fails and others succeed, the audit result retains successful findings and records per-target failures. The run does not discard the whole batch. Remediation for a multi-target transform, when offered later, stays `partial` when only some targets change. Uncertainty on one target preserves that target and does not rewrite siblings.

### Website pack is opt-in and fail-closed on SSRF

Pack id `anthropies.audit-website` requires explicit enablement. Network is `remote-opt-in`. Before fetch, the client blocks link-local, loopback, private, metadata, and non-http(s) URL classes unless a documented local-test override is set for fixtures. Redirects follow a strict policy with a hop cap and re-check the destination against the same SSRF rules. Responses must match an allowlisted content type. Download size and total request count stay under budgets. Sitemap mode only follows URLs that remain inside the configured host and path policy.

Alternative considered: default-on website fetch from CLI args alone. Rejected because accidental SSRF is too easy.

### HTTP version and channels

Health and capabilities `version` stay `"0.3.0"`. Pack `implementationVersion` values may be `0.4.0`. Findings stay on `deterministic`, `c2pa`, `official`, and `statistical` only.

### Freeze vs implement

This change directory freezes requirements. Implementation tasks stay unchecked until a later Foreman implement unit. Do not register packs in this freeze unit.

## Risks / Trade-offs

- [Symlink escape] → Resolve and refuse paths outside the root. Add negative controls.
- [Concurrent flake] → Sort before encode. Golden tests compare ordered JSON.
- [SARIF overclaim] → Keep one channel per SARIF scope. Reject blended score fields.
- [Website SSRF via redirect] → Re-validate every hop. Cap hops. Fail closed.
- [Sitemap fan-out] → Enforce request budget and host policy before queueing URLs.
- [Partial failure ambiguity] → Keep per-target status explicit. Do not upgrade batch success when any required target fails.

## Migration Plan

1. Land OpenSpec freeze documents and pass strict validate.
2. Later implement directory bounds and planner reuse behind tests.
3. Later add concurrency aggregation and SARIF export tests.
4. Later add website SSRF negative controls and opt-in gates.
5. Register packs and advertise capabilities. Rollback is revert of implement commits.

## Open Questions

None that block the freeze. Exact SARIF tool-component names and CLI flag spellings are implement decisions as long as scenarios pass.
