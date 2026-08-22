## 1. Wire Inspector and Cleaner

- [ ] 1.1 Create `src/core/builtin-registry.ts`.
- [ ] 1.2 Create `tests/pipeline-compat.test.ts`.
- [ ] 1.3 Modify Inspector to call inspectArtifact.
- [ ] 1.4 Modify Cleaner to call transformArtifact for text and keep writeAtomic on success only.
- [ ] 1.5 Run `pnpm test tests/pipeline-compat.test.ts tests/cert-layer-a.test.ts tests/write-guard.test.ts tests/json-stdout.test.ts tests/http-server.test.ts`.
