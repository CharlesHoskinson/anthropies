## 1. Goldens and schema

- [ ] 1.1 Create failing `tests/sidecar-protocol.test.ts`.
- [ ] 1.2 Add `src/sidecars/protocol.ts` and `fixtures/sidecars/v1/` goldens.
- [ ] 1.3 Run `pnpm test tests/sidecar-protocol.test.ts`. Expect PASS.

## 2. Loopback client

- [ ] 2.1 Create failing `tests/sidecar-client.test.ts`.
- [ ] 2.2 Create `src/sidecars/client.ts` that refuses non-loopback URLs without calling fetch.
- [ ] 2.3 Run `pnpm test tests/sidecar-client.test.ts`. Expect PASS.

`sprint0-kernel-strict-decode` archived 2026-08-21.
