## Why

Sprint 0 T11. GET /capabilities must advertise kernel API version and pack inventory without changing HTTP 0.3.0.

## What Changes

Extend `CapabilitiesResponse` with `kernelApiVersion` and `packs[]`. Keep `version`, `tools`, and `scorers`. Update OpenAPI. Add `tests/http-capabilities.test.ts`.

## Non-goals

- Do not change `serviceVersion` off `0.3.0`.
- Do not add `/humanize`.
- Do not add a score field.
- Do not invoke Inspector.

## Capabilities

### New Capabilities

- `http-capabilities`: kernelApiVersion plus packs inventory on GET /capabilities

## Impact

`src/http/schema.ts`, `src/http/server.ts`, `src/http/openapi.ts`, `tests/http-capabilities.test.ts`.
