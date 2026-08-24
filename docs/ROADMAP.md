# Anthropies Capability-Pack Roadmap

**Status:** Shipped in 1.0.0 DarioCyclovir. This file is the design-time roadmap. Current pack and protocol pins are in [`COMPATIBILITY.md`](COMPATIBILITY.md).

**Approved:** 2026-08-17

**Target:** Feature parity with `watermarks-remover` main plus PR #109

**Delivery model:** Releasable capability packs implemented by Grok and audited by three independent SOL agents

## Purpose

Anthropies will reach capability parity with `watermarks-remover` without copying its monolithic dispatch structure or weakening Anthropies' evidence and claim semantics.

The implementation will separate removal elements into independently versioned packs behind a small TypeScript kernel. Native TypeScript remains the default runtime. Heavy machine-learning components may run as optional, version-pinned Python sidecars.

The architecture assumes that Anthropic and other vendors will change watermark schemes, model identifiers, detector payloads, and service contracts. A vendor change must require replacing or upgrading a pack, not rewriting the core pipeline or changing the meaning of an existing report.

## Point-in-time baseline

This roadmap was designed against these repository states:

- Anthropies: `049152f`, version `0.4.0`; 59 tests passing at design time.
- `watermarks-remover` main: `c2ac8ee`.
- [`watermarks-remover` PR #109](https://github.com/guillaumemeyer/watermarks-remover/pull/109): head `4d83ec91e1a6d6d56dc52bd93914fdcaac39a35a`.

Future planning must re-check these refs. Feature changes after this baseline enter the roadmap through an explicit parity review rather than silently expanding an in-flight sprint.

## What parity means

Parity means Anthropies offers an equivalent supported workflow for:

- Deterministic text and metadata inspection and cleaning.
- The broad file-format matrix.
- Directory and website audit workflows.
- Non-origin rewrite and statistical observation.
- Pluggable text-watermark detection, including the PR #109 seams.
- Optional image scoring and heavy image-removal research harnesses.
- HTTP, container, CI, reporting, and operational integration.

Parity does not require identical implementation languages, response vocabulary, packaging, marketing claims, or failure behavior. Anthropies intentionally retains stricter evidence boundaries.

## Product and claim invariants

The following rules apply to every sprint and pack:

1. Operations apply only to outputs or files the user owns or is authorized to process.
2. The four report channels remain separate:
   - `deterministic`
   - `c2pa`
   - `official`
   - `statistical`
3. A `markClass` is orthogonal to a report channel. Pixel, keyed-text, provenance, metadata, trailer, and invisible-Unicode findings do not create new blended score channels.
4. Deterministic and C2PA results may certify only the bytes or metadata actually inspected or removed.
5. Official results contain availability and raw vendor evidence. Anthropies does not paraphrase a vendor payload as proof that a watermark is gone.
6. Statistical, rewrite, pixel, and research-scorer results are best-effort evidence. They cannot produce a universal `clean`, `human`, or `watermark removed` verdict.
7. Absence of a mark does not prove Claude was uninvolved or that text was human-written.
8. The core distribution remains usable without optional packs, models, remote services, or Python.
9. Remote calls and model downloads are opt-in. Loopback is the default network boundary.
10. Candidate rewrite selection remains independent from detector results unless a future, separately approved design changes that policy.

## Architecture

### Overview

```text
owned artifact
    -> classify
    -> resolve applicable capabilities
    -> pre-inspect
    -> run ordered transformations
    -> post-inspect
    -> assemble evidence and report
    -> atomically publish output through CLI or HTTP transport
```

The TypeScript kernel owns classification, planning, ordering, resource policy, report semantics, transport-neutral execution, and atomic output handling. Capability packs own format- or scheme-specific inspection and transformation.

### Proposed source boundaries

```text
src/
  core/
    domain.ts          stable artifact, evidence, outcome, and report types
    capability.ts      pack manifest and capability interfaces
    registry.ts        registration, compatibility, and ownership checks
    planner.ts         applicability and ordered execution plans
    pipeline.ts        immutable pre-inspect/transform/post-inspect flow
    policy.ts          resource, network, ownership, and certification policy
  packs/
    layer-a/
    container-metadata/
    raster-metadata/
    c2pa/
    rewrite/
    detector-anthropic/
    detector-gemini/
    markllm/
    image-synthid-score/
    ctrlregen/
    markdiffusion/
    audit-directory/
    audit-website/
  sidecars/
    protocol.ts        versioned request and response schemas
    client.ts          loopback client, limits, and compatibility checks
  transports/
    cli/
    http/
```

The implementation plan may adjust filenames to follow established repository conventions, but it must preserve these ownership boundaries.

### Stable domain model

The core schemas include:

- `Artifact`: immutable bytes, optional name, media type, classified kind, and digest.
- `CapabilityId`: stable pack identity plus API and implementation versions.
- `Availability`: `available`, `unavailable`, `incompatible`, or `degraded`, with a machine-readable reason.
- `Finding`: channel, mark class, status, evidence, and pack provenance.
- `Removal`: channel, mark class, changed scope, and evidence.
- `Evidence`: contract or empirical provenance, raw-reference metadata, and version fingerprints.
- `TransformResult`: output artifact, removals, evidence, residual findings, and warnings.
- `RunReport`: ordered pre- and post-inspection results with the existing honesty policy.

Operational outcomes remain independent:

```text
execution:    success | error
capability:   available | unavailable | incompatible | degraded
finding:      present | absent | indeterminate
remediation:  changed | unchanged | partial
evidence:     contract | empirical
```

No generic `suspicious`, blended `watermarkScore`, or global `removed` field may collapse these dimensions.

### Capability contract

Every pack manifest declares:

- Stable ID and display name.
- Kernel API range and implementation version.
- `schemeEpoch` and `evidenceEpoch` when vendor or empirical behavior is involved.
- Supported artifact kinds and mark classes.
- Supported operations: inspect, remove, rewrite, score, or audit.
- Channel ownership.
- Priority plus explicit before/after ordering constraints.
- Runtime type: native TypeScript, local process, or loopback sidecar.
- Network and privacy effects.
- Time, memory, input-size, output-size, and concurrency limits.
- License and distribution policy.
- Upstream source, commit, model, configuration, and container digests when applicable.

The stable behavioral interface is equivalent to:

```ts
interface CapabilityPack {
  readonly manifest: CapabilityManifest
  probe(context: RunContext): Effect.Effect<Availability>
  inspect(
    artifact: Artifact,
    context: RunContext
  ): Effect.Effect<ReadonlyArray<Finding>, CapabilityFailure>
  transform?(
    artifact: Artifact,
    context: RunContext
  ): Effect.Effect<TransformResult, CapabilityFailure>
}
```

The registry rejects incompatible kernel ranges and conflicting authoritative ownership of the same artifact-kind, mark-class, and operation tuple unless policy explicitly selects one implementation.

### Sidecar protocol

Optional Python engines communicate only through a versioned loopback protocol:

- `GET /health`
- `GET /capabilities`
- `POST /v1/inspect`
- `POST /v1/transform`

Requests and responses include protocol version, capability identity, implementation version, scheme epoch, artifact digest, limits, evidence provenance, and deterministic error codes. Binary payloads use bounded inline bytes or an explicitly managed local blob reference.

Sidecars must be pinned by container digest, dependency lock, upstream commit, model or codebook digest, and configuration digest. Incompatible protocols fail closed for certification. An absent optional sidecar reports `unavailable` without breaking unrelated core operations.

Pack-specific environment variables are read by adapter configuration, never throughout the core pipeline.

### Data flow and writing policy

1. A transport decodes an owned artifact and validates the request.
2. The classifier determines kind using bytes plus a non-authoritative suffix hint.
3. The planner selects applicable packs and validates ordering, compatibility, resource limits, and conflicts.
4. Pre-inspection records an immutable evidence snapshot.
5. Each transformation receives an immutable artifact and returns a new artifact.
6. Post-inspection runs independently and records residual findings.
7. The report assembler preserves channel boundaries, pack provenance, and honesty text.
8. The transport performs the only filesystem write.
9. Output is written atomically to a new path. In-place replacement, when explicitly requested, occurs only after successful post-inspection and write verification.

The original remains untouched after uncertainty, timeout, malformed output, incompatibility, or partial transformation.

## Sprint roadmap

Each sprint produces a separately reviewable specification, implementation plan, release candidate, and audit record.

### Sprint 0: Capability Pack Contract v1

**Goal:** Establish the kernel contracts before porting or adding algorithms.

**Deliverables:**

- Stable domain schemas and encoded JSON forms.
- Capability manifest, registry, planner, and compatibility checks.
- Transport-neutral pipeline skeleton preserving current behavior.
- Versioned sidecar schemas and golden transcripts.
- `/capabilities` response shape.
- Capability availability, licensing, resource, privacy, and failure metadata.
- Contract fixtures for available, unavailable, degraded, incompatible, timeout, malformed-output, and conflicting-owner cases.

**Acceptance:**

- Anthropies' existing commands and reports remain behaviorally compatible.
- Running without optional packs produces the current supported behavior.
- An unavailable pack cannot change unrelated clean success.
- No cross-channel score or verdict is introduced.
- Contract tests select a nonzero inventory and prove both positive and negative controls.

**Excluded:** Algorithm ports, new formats, Docker orchestration, remote execution, and a generic third-party marketplace.

### Sprint 1: Deterministic Format Packs

**Goal:** Reach the deterministic and metadata format matrix of the parity target.

**Sequence:**

1. Extract shared classification, safe I/O, archive, and format-handler primitives.
2. Convert existing text, SVG, HTML, Markdown, DOCX, ODT, PDF, and raster logic into packs without changing claims.
3. Add WebP, AVIF, HEIC, BMP, GIF, and TIFF.
4. Add XLSX and PPTX through shared OOXML primitives.
5. Add EPUB and richer embedded-data handling.
6. Complete structural PDF behavior with explicit qpdf/exiftool degradation evidence.

**Acceptance:** Inspect-clean-reinspect fixture pairs, byte-preservation checks, magic/suffix disagreement, binary refusal, archive expansion caps, atomic writes, Windows and Linux coverage, and accurate `/capabilities` advertising for every format.

**Excluded:** Pixel marks, soft-bound image credentials, rewrite, vendor detection, and audits.

### Sprint 2: Audit and Reporting Packs

**Goal:** Match directory, concurrency, SARIF, and website-audit workflows.

**Deliverables:**

- Bounded directory scanning using the same capability planner as single-file operations.
- Configurable concurrency with deterministic aggregation.
- JSON and channel-scoped SARIF output.
- Partial-failure reporting that retains successful findings.
- Opt-in website and sitemap audit with SSRF defense, redirect policy, content-type validation, download caps, and request budgets.

**Acceptance:** Stable ordering, path safety, concurrency bounds, actionable SARIF mappings, remote negative controls, and no crawling outside explicit policy.

**Excluded:** Browser rendering, unrestricted crawling, and hosted cloud service operation.

### Sprint 3: Rewrite and Stylometry Pack

**Goal:** Match and improve the parity target's Layer B workflow while retaining Anthropies' title-restoration claims.

**Deliverables:**

- Multi-candidate non-origin rewrite orchestration.
- Print-prompt as the zero-dependency default.
- Optional Ollama and OpenAI-compatible loopback adapters.
- Lexical candidate selection independent of detector outcomes.
- Five-gram overlap and stylometric observations with computed, insufficient, and not-run states.
- Per-candidate observation records.

**Acceptance:** Remote endpoints require explicit enablement; code and fewer than 200 prose tokens remain insufficient; no detector-driven success verdict or CI efficacy threshold; facts, URLs, and fenced code preservation are covered.

**Excluded:** Official-removal certification and bundled language models.

### Sprint 4: Detector Registry Pack

**Goal:** Reach text-detection parity with PR #109 through replaceable adapters.

**Deliverables:**

- Detector registry using the same capability manifest and version rules.
- Gemini SynthID text adapter.
- Anthropic adapter seam that remains unavailable until a real supported service is configured.
- MarkLLM same-configuration harness.
- Dedicated `/detect` route.
- Opt-in inspect detection plus before/after and per-candidate observations.
- Raw vendor payload retention with privacy controls.

**Acceptance:** Unconfigured, rate-limited, malformed, and unreachable adapters are channel-local and fail-soft; unset Anthropic configuration returns unavailable with no score; candidate selection remains lexical; OpenAPI and capability contracts have golden tests.

**Excluded:** Cross-vendor equivalence, guessed Anthropic schemes, and using detection as a clean certificate.

### Sprint 5: Image Scoring Sidecar Pack

**Goal:** Reach PR #109 reverse-SynthID image-scoring parity behind the v1 sidecar protocol.

**Deliverables:**

- Pinned Python scorer service.
- Health, capability, compatibility, and provenance negotiation.
- Loopback authentication option, request limits, timeouts, and stdout purity.
- Container or virtual-environment lock, SBOM, upstream pin, and model/configuration digest.
- Evidence-only statistical reporting.

**Acceptance:** The publishable core contains no incompatible or noncommercial code; absence reports unavailable; malformed and incompatible sidecars cannot certify results; scores remain observations rather than removal verdicts.

**Excluded:** Image removal.

### Sprint 6A: CtrlRegen Pack

**Goal:** Add optional pixel-watermark removal through CtrlRegen.

**Acceptance:** Pinned runtime and model provenance, local-only or distributable status derived from actual license terms, resource caps, immutable before/after artifacts, residual-risk evidence, and no effect on the disabled core.

### Sprint 6B: MarkDiffusion Pack

**Goal:** Add optional MarkDiffusion detection and purification as a separate release.

**Acceptance:** The same isolation, provenance, resource, evidence, licensing, and disabled-core requirements as Sprint 6A, with pack-specific controlled fixtures and empirical tests.

### Sprint 6C: MarkLLM Pack

**Goal:** Package the controlled text-watermark generation/detection harness independently from vendor detection.

**Acceptance:** Algorithm and configuration identity are mandatory; same-configuration results cannot be presented as general vendor efficacy; heavyweight dependencies remain optional and pinned.

### Sprint 7: Distribution and Integration

**Goal:** Stabilize installation and operations after pack APIs settle.

**Deliverables:**

- Compose profiles for licensed and local-only packs.
- Health checks and capability discovery.
- Independently installable pack artifacts.
- Kernel and pack compatibility matrix, including current and previous protocol versions.
- Release images only where licensing permits.
- CLI, HTTP, skill, operator, security, and troubleshooting documentation.

**Acceptance:** The core remains TypeScript-only and publishable; compose configurations validate; optional packs can be enabled independently; no monolithic all-model image or automatic model download is introduced.

## Dependency order

```text
Contract -> Formats -> Audit
Contract -> Rewrite -> Detector registry
Contract -> Image scorer -> CtrlRegen / MarkDiffusion / MarkLLM
All stable packs -> Distribution
```

Audit and rewrite may proceed independently only after Contract v1 is released. Structural PDF follows shared container primitives. Heavy ML packs remain separate releases so licensing, operational cost, and audit scope do not contaminate one another.

## Evidence model

### Contract ledger

The contract ledger records schemas, parser behavior, mocked HTTP, synthetic fixtures, route behavior, deterministic transformations, resource limits, and failure handling. It proves software conformance only.

Every contract check includes both polarities where meaningful. A green run with zero selected tests is an error. Timeout, skip, shadow, unavailable, and invalid are never normalized to pass.

### Empirical efficacy ledger

The efficacy ledger records tests using genuine, owned vendor outputs and real detector or scorer versions. A valid before/after experiment includes:

- Prompt or prompt hash according to data policy.
- Requested and returned model IDs.
- Vendor surface and acquisition timestamp.
- Input digest and ownership or consent metadata.
- Pack, detector, scorer, upstream, model, configuration, and epoch versions.
- Untouched positive control.
- Benign-transformation control.
- Human and non-Anthropic negative controls.
- Raw distributions, sample count, uncertainty, and effect size.

No mocked result, synthetic mark, unavailable official adapter, or same-configuration research harness enters the efficacy ledger as successful removal evidence.

## Fixture provenance

Every fixture has an immutable manifest entry with:

- SHA-256 digest.
- Origin class: synthetic, generated by open harness, captured vendor, or third-party.
- Acquisition timestamp and source.
- Vendor, product, model, API, and CLI versions when applicable.
- Detector, scorer, algorithm, configuration, and upstream commit identifiers.
- Applied transformations.
- License, consent, and ownership basis.
- Purpose: contract-only or efficacy-eligible.
- Superseded-by link when replaced.

Synthetic and fake fixtures are visibly named. Sensitive raw captures live outside Git; Git stores signed or authenticated manifests, hashes, and redacted derived measurements.

## Continuous scheme adaptation

Vendor and empirical compatibility use two counters independent from app semantic versioning:

- `schemeEpoch`: the known vendor scheme, model family, detector contract, or payload generation.
- `evidenceEpoch`: the corpus and experimental baseline supporting an efficacy statement.

A changed model ID, response schema, detector version, capability fingerprint, sidecar digest, or control distribution triggers drift review. Unknown or incompatible values produce unverified or incompatible evidence. They cannot silently reuse a prior efficacy claim.

Advancing an epoch expires only affected empirical evidence. Deterministic byte- and metadata-removal certificates remain valid when their own implementation and fixture fingerprints are unchanged.

### Scheduled canary

A low-volume, rate- and budget-capped canary will:

1. Capture owned outputs from fixed and randomized prompts across an allowlist of current models.
2. Verify returned model identity and capture completeness.
3. Run positive and negative controls against the configured detector or scorer.
4. Apply the selected pack.
5. Re-run the same detector or scorer version.
6. Record distributions and drift indicators.

A canary is valid only when capture, identity, parsing, detector availability, and control discrimination all succeed. Network outage, rate limiting, nondiscriminating controls, or schema drift yields unavailable or invalid, not pass. Canary network availability does not block ordinary pull requests, but an invalid canary blocks new or renewed efficacy claims.

## Failure and exit policy

- Input is preserved on any uncertainty.
- Optional unavailability is fail-soft unless the caller explicitly requires that capability.
- Protocol incompatibility is fail-closed for certification.
- Deterministic or C2PA residual findings continue to drive failure when certification was requested.
- Statistical and research findings do not independently drive a universal clean verdict.
- Partial transformation is reported as partial and cannot replace the original.
- Degraded execution with a known residual cannot be reported as certified success.
- Timeouts and malformed sidecar output use deterministic error codes and retain captured diagnostics without contaminating stdout JSON.

## Grok implementation and SOL audit gate

Every sprint uses the following execution contract.

### Before Grok

- Freeze the sprint specification, base SHA, worktree, file allowlist, exact test commands, and acceptance predicates.
- Confirm Grok authentication using an anchored positive output signal; `grok models` exit code alone is insufficient.
- Revalidate CLI flags against the installed Grok version.
- Use an isolated, secrets-free worktree and isolated vendor home.
- Refuse `.env` files and private keys; exclude harness and Git internals from the scan without weakening the scan.
- Do not authorize Grok to commit, push, merge, rename branches, authenticate, or modify files outside the sprint allowlist.

### Grok implementation round

- Implement with test-first increments.
- Record the exact tree, commands, tool versions, selected-test count, raw outcomes, output hashes, and diff summary.
- Treat exit status as transport evidence, not the test verdict.
- Produce a fresh, machine-readable report bound to the candidate tree.

### Independent verification

The orchestrator:

- Inspects the complete diff, stat, and file modes.
- Reconciles index and worktree state.
- Re-adds files after any late edit and verifies the staged blobs.
- Runs the full gate in a clean worktree at the exact candidate SHA.
- Verifies nonzero test selection, both-polarity controls, report freshness, and artifact content.

### Three SOL audits

Three independent `gpt-5.6-sol` agents audit the actual diff and fresh evidence:

1. **QA and evidence:** tests, controls, failure states, empirical/contract separation, and efficacy claims.
2. **Code quality and security:** architecture boundaries, type safety, sidecar isolation, resource limits, I/O safety, and dependency risk.
3. **Documentation and claims:** capability accuracy, provenance, licensing, operational instructions, version drift, and honesty invariants.

Repeated execution of the same predicate is not independent corroboration. Each auditor must inspect primary evidence rather than another auditor's summary.

Material findings return to Grok as a bounded rework round. All three auditors review the changed diff again. A sprint is merge-ready only when the orchestrator's full gate passes and all three audits pass without unresolved material findings.

## Foreman footguns carried forward

- Green CI proves only the paths that CI reached.
- Grok authentication is determined from an anchored positive signal, not exit code.
- A local dirty-tree gate is not equivalent to CI.
- Counts from timed-out test slices are invalid.
- A documented API behavior remains an unexecuted claim until safely verified.
- Empty test selection is an error.
- Every decision predicate needs known-good and known-bad controls.
- A commit records the index; staged and unstaged state must be reconciled after late edits.
- Temp-file replacement must preserve executable modes.
- Raw lock wrappers can self-deadlock; use the repository's reentrant test runner.
- A fresh report and verified artifact content are required; file existence is not enough.
- Scheduling backstops prevent session loss but never become the work schedule.

## Overall completion criteria

The parity programme is complete when:

1. All sprint acceptance criteria pass on supported platforms.
2. `/capabilities` accurately reports installed, missing, degraded, and incompatible packs.
3. Anthropies covers the parity baseline's supported deterministic formats, audit workflows, rewrite/stylometry behavior, detector seams, image scorer, and optional heavy harnesses.
4. Optional packs can be absent or disabled without changing core behavior.
5. Every heavy pack has pinned provenance, resource policy, licensing disposition, and an SBOM or equivalent dependency record.
6. Contract and empirical evidence remain separately queryable.
7. Scheme drift invalidates affected empirical claims without requiring a kernel rewrite.
8. Existing four-channel and ownership claim invariants remain enforced by tests.
9. Current and previous sidecar protocol versions pass the compatibility matrix or report explicit incompatibility.
10. Each sprint has a Grok implementation record, independent verification record, and three passing SOL audit records.

## First implementation boundary

The first separately specified and implemented sub-project is Sprint 0, Capability Pack Contract v1. It introduces contracts and extracts current behavior behind them without adding new removal algorithms. No later sprint begins until Contract v1 is reviewed, merged, and reflected in a fresh Graphify update.
