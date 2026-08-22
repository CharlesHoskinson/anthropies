## 1. Policy tests then implementation

- [ ] 1.1 Create `tests/core-policy.test.ts` with known-good and known-bad for fail-soft, certification channels, preserveOriginal timeout, and conflict.
- [ ] 1.2 Run the test. Expect FAIL.
- [ ] 1.3 Create `src/core/policy.ts`.
- [ ] 1.4 Run `pnpm test tests/core-policy.test.ts`. Expect PASS.

Do not start until `sprint0-kernel-strict-decode` archives.
