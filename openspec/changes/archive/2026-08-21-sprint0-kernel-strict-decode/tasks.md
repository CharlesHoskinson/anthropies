## 1. Discriminating tests

- [ ] 1.1 Edit `tests/core-domain.test.ts`. Remove unused imports. Remove `onExcessProperty` from kernel decode calls.
- [ ] 1.2 Add known-good decode of a valid KernelFinding. Add known-bad cases for `watermarkScore`, `suspicious`, and `score` with default parse options.
- [ ] 1.3 Add Artifact tests: byte copy after caller mutation, digest mismatch rejection, `sha256:` prefix rejection, encoded bytes are base64.
- [ ] 1.4 Run `pnpm test tests/core-domain.test.ts`. Expect FAIL against current T1 code.

## 2. Domain strictness

- [ ] 2.1 Edit `src/core/domain.ts` so listed Schema classes reject unknown properties by default.
- [ ] 2.2 Copy bytes in `makeArtifact` before hashing.
- [ ] 2.3 Reject Artifact decode when digest does not match sha256 of bytes.
- [ ] 2.4 Run `pnpm test tests/core-domain.test.ts`. Expect PASS.

## 3. Manifest strictness

- [ ] 3.1 Edit `tests/core-capability.test.ts`. Add missing-`kernelApiMax` known-bad. Decode a valid manifest plus `score` with default parse options and expect throw.
- [ ] 3.2 Edit `src/core/capability.ts` so CapabilityManifest and RunContext reject unknown properties by default.
- [ ] 3.3 Run `pnpm test tests/core-capability.test.ts`. Expect PASS.
- [ ] 3.4 Run `pnpm exec tsc -p tsconfig.json --noEmit`. Expect exit 0.

Do not git commit. Architect commits after Codex Sol and Claude review.
