## Why

Sprint 0 T9. Versioned loopback sidecar schemas and golden transcripts. Parallel with policy after kernel strict decode archives. No Python process.

## What Changes

Add `src/sidecars/protocol.ts`, goldens under `fixtures/sidecars/v1/`, and `tests/sidecar-protocol.test.ts`.

## Non-goals

- Do not start a Python sidecar.
- Do not add `/humanize`.
- Do not send bytes off loopback.

## Capabilities

### New Capabilities

- `sidecar-protocol`: GET /health, GET /capabilities, POST /v1/inspect, POST /v1/transform

## Impact

`src/sidecars/protocol.ts`, `fixtures/sidecars/v1/`, `tests/sidecar-protocol.test.ts`.
