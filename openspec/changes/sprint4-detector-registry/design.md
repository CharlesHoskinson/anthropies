## Context

Sprint 0 kernel contracts are archived. Sprint 1 Phase A format packs are in flight or frozen separately. Wave 1 already keeps official Unavailable when `ANTHROPIC_DETECT_URL` is unset. See proposal.md for why Sprint 4 exists.

## Goals / Non-Goals

**Goals:** Register replaceable text detectors as capability packs. Expose `/detect`. Keep channel boundaries. Fail soft on adapter faults. Keep health at `0.3.0`.

**Non-Goals:** Clean-certificate language from detection. Cross-vendor score equivalence. Guessing Anthropic sampling parameters. Shipping heavy MarkLLM as a required core dependency.

## Decisions

1. **Detector packs reuse CapabilityManifest.** Detector ids register through the same registry and kernel-range checks as format packs. Do not invent a parallel registry type.

2. **Channel ownership stays fixed.** Anthropic seam owns `official`. Gemini SynthID and MarkLLM own `statistical` evidence only. No pack may emit a blended `watermarkScore`.

3. **Anthropic is a seam, not a guessed client.** WHILE `ANTHROPIC_DETECT_URL` is unset, official status is `unavailable` and the payload has no `score`. Configuration means an explicit supported URL. Do not invent scheme parameters.

4. **MarkLLM is same-configuration only.** The harness verifies a scheme and configuration the operator controls. Reports must keep algorithm and configuration identity. Results must not be labeled as Anthropic or Gemini vendor efficacy.

5. **`/detect` accepts GET and POST.** Both methods run the same detect path for owned text. Response keeps four channels separate. OpenAPI documents both methods.

6. **Fail-soft is channel-local.** Unconfigured, rate-limited, and malformed adapters mark that channel unavailable, degraded, or indeterminate. Unrelated channels and deterministic clean still succeed.

7. **Detection is never a clean certificate.** A detect result must not flip remediation to certified clean and must not suppress residual honesty text.

## Risks / Trade-offs

- [Official channel contamination] → Keep Anthropic on `official` only. Forbid score on Unavailable.
- [MarkLLM read as vendor oracle] → Require configuration identity on harness evidence. Forbid cross-vendor equivalence claims.
- [HTTP version drift] → Golden tests lock health and capabilities `version` to `0.3.0`.
- [Adapter faults aborting clean] → Optional detector packs use fail-soft unless explicitly required.

## Migration Plan

This change freezes OpenSpec only. Later implement work adds packs behind feature tests. Rollback is deletion of the change directory before archive. After archive, revert the implementing PR if packs misbehave.

## Open Questions

None that block this freeze. Exact Gemini endpoint env name and MarkLLM pin digests wait for the implement change.
