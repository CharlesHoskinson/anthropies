## 1. Registry tests then implementation

- [ ] 1.1 Create `tests/core-registry.test.ts` with known-good and known-bad for range, conflict, empty kinds, and none.
- [ ] 1.2 Run the test. Expect FAIL.
- [ ] 1.3 Create `src/core/registry.ts`.
- [ ] 1.4 Run `pnpm test tests/core-registry.test.ts`. Expect PASS.
