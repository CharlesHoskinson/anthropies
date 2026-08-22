## Context

Sprint 0 archived the sidecar protocol at `1.0.0` and the loopback client. Sprint 1 format packs and later freezes own their surfaces separately. ROADMAP Sprint 5 requires reverse-SynthID image-scoring parity behind that protocol. See proposal.md for why this freeze exists.

## Goals / Non-Goals

**Goals:** Freeze the OpenSpec for a pinned Python image scorer, loopback negotiation, statistical-only observations, unavailable-on-absence behavior, and core licensing isolation. Keep HTTP health at `0.3.0`.

**Non-Goals:** Implement the Python service in this unit. Ship image removal. Put noncommercial weights or code in the publishable core. Bump sidecar protocol or HTTP serviceVersion.

## Decisions

1. **Protocol stays `1.0.0`.** The scorer speaks the existing sidecar health, capabilities, and inspect shapes. Incompatible protocol versions fail closed for this pack's evidence.

2. **Pack id follows ROADMAP ownership.** The TypeScript adapter lives under `image-synthid-score` and registers as an optional capability pack. Exact published id string is fixed in the implement change and golden capabilities tests.

3. **Operations are score or inspect only.** The manifest must not claim `remove`. Sprint 6 owns pixel removal packs. This pack never rewrites owned image bytes.

4. **Channel is statistical. Mark class is pixel.** Observations are best-effort evidence. They must not introduce `watermarkScore` or a finding top-level `score` field that the kernel already rejects on sidecar findings.

5. **Loopback is default.** Unset configuration resolves to `127.0.0.1` or `localhost`. Non-loopback URLs fail with `unavailable` and `privacy-denied` under the existing client rule.

6. **Absence is unavailable, not a silent pass.** An optional missing scorer reports `unavailable` with `optional-absent` or `probe-failed`. Unrelated core packs still run.

7. **Malformed and incompatible responses cannot certify.** Decode failures and protocol mismatches produce `malformed-output` or `incompatible`. They do not mint certified statistical findings.

8. **Publishable core stays clean.** Noncommercial or incompatible scorer code, models, and containers stay in the optional pack distribution. Core `distribution` remains free of those artifacts. Manifest `license` is `optional-noncommercial` or `optional-restricted` when the upstream terms require it.

9. **Pins are mandatory for optional release.** Container or venv lock, upstream commit, model or codebook digest, configuration digest, and SBOM or equivalent inventory ship with the optional pack.

10. **HTTP serviceVersion stays `0.3.0`.** Capabilities may list the new pack id after implement. Health JSON stays `{ ok: true, version: "0.3.0" }`.

## Risks / Trade-offs

- [Scorer numeric output colliding with forbidden `score` fields] → Keep observations on statistical findings and evidence fingerprints. Forbid `watermarkScore` and finding top-level `score`.
- [Noncommercial code leaking into core] → Optional distribution only. Core package inventory tests must fail if the scorer tree is present.
- [Operators reading absence as clean] → Unavailable status plus honesty text. Absent pixel signal is not a universal clean claim.
- [Accidental image rewrite] → Manifest excludes `remove`. No transform path in this pack.
- [HTTP version drift] → Golden tests lock health and capabilities `version` to `0.3.0`.

## Migration Plan

This change freezes OpenSpec only. Later implement work adds the Python service and TypeScript adapter behind failing contract tests. Rollback before archive is deletion of this change directory. After archive, revert the implementing PR if the optional pack misbehaves. Core users who never enable the pack see no behavior change.

## Open Questions

None that block this freeze. Exact published pack id string, env var name for the loopback base URL, and upstream reverse-SynthID pin digests wait for the implement change.
