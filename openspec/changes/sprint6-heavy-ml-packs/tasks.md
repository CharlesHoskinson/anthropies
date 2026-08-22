## 1. License freeze

- [x] 1.1 Record Apache-2.0 for MarkLLM and MarkDiffusion
- [x] 1.2 Record missing LICENSE on CtrlRegen GitHub and noai-watermark
- [x] 1.3 Owner rule: distribute open-source wraps. Implement CtrlRegen-method in original code.

## 2. MarkLLM optional pack (distributable)

- [ ] 2.1 Pin THU-BPM/MarkLLM Apache-2.0
- [ ] 2.2 Adapter pack, same-configuration evidence, fail-soft absence
- [ ] 2.3 Contract tests. Do not copy Python into `src/`

## 3. MarkDiffusion optional pack (distributable)

- [ ] 3.1 Pin THU-BPM/MarkDiffusion Apache-2.0
- [ ] 3.2 Detect and purify adapters, residual-risk honesty
- [ ] 3.3 Contract tests. Do not copy Python into `src/`

## 4. CtrlRegen-method original pack

- [ ] 4.1 Design original sidecar. Do not vendor unlicensed repos
- [ ] 4.2 Implement original regeneration path. Operator-supplied weights only
- [ ] 4.3 Tests: no vendored `yepengliu/CtrlRegen` or `mertizci/noai-watermark`
- [ ] 4.4 Unavailable GPU or weights fail-soft

## 5. Inventory

- [ ] 5.1 GET /capabilities lists optional Sprint 6 packs when installed
- [ ] 5.2 Health stays 0.3.0
- [ ] 5.3 Publishable core inventory excludes unlicensed trees
