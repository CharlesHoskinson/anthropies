## Context

ROADMAP Sprint 0 acceptance requires available, unavailable, degraded, incompatible, timeout, malformed-output, and conflicting-owner, each with a positive and negative control, and a nonzero selected inventory.

## Goals / Non-Goals

**Goals:** Machine-readable case list of seven ids. Each case has both polarities. Inventory length is 7. Empty vitest selection is a failure.

**Non-Goals:** Live vendor detectors. Efficacy ledger.

## Decisions

`CONTRACT_CASES` is a const array of seven ids. Tests iterate it. Timeout and malformed-output use sidecar-client mocks. Conflicting-owner uses registry.register. Unavailable uses optional-absent. Degraded uses PDF-style honesty without certifying absence.

## Risks / Trade-offs

Sidecar mocks must not call the network.
