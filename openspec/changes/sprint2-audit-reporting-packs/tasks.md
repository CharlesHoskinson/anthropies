## 1. Freeze gate (this unit)

- [x] 1.1 Write `proposal.md`, `design.md`, `tasks.md`, and `specs/audit-reporting-packs/spec.md` under `openspec/changes/sprint2-audit-reporting-packs/`
- [x] 1.2 Run `openspec validate sprint2-audit-reporting-packs --strict` and verify exit 0
- [x] 1.3 Do not git commit in the freeze unit. Do not add audit pack sources in the freeze unit

## 2. Bounded directory scan (later implement)

- [ ] 2.1 Add directory root, depth, file-count, and size bounds with path-escape negative controls. Verify `pnpm test` covers refuse-outside-root
- [ ] 2.2 Plan each selected file with the same capability planner as single-file inspect. Verify planner ids match single-file for the same bytes
- [ ] 2.3 Treat empty selection as an error. Verify known-bad empty root or fully filtered selection fails closed

## 3. Deterministic concurrency (later implement)

- [ ] 3.1 Enforce configurable concurrency so inflight work never exceeds the bound. Verify a stress fixture stays at or under the bound
- [ ] 3.2 Aggregate results by stable relative path then channel then mark class. Verify two shuffled completion orders encode identical JSON

## 4. JSON and channel-scoped SARIF (later implement)

- [ ] 4.1 Emit JSON audit output that keeps findings only on `deterministic`, `c2pa`, `official`, and `statistical`
- [ ] 4.2 Emit SARIF scoped per channel with actionable rule mappings. Verify mixed-score fields are rejected
- [ ] 4.3 Assert audit sources and fixtures do not contain `watermarkScore` or flat mixed `removed` bags

## 5. Partial-failure reporting (later implement)

- [ ] 5.1 Keep successful findings when one target fails. Verify the batch report still lists the successful target findings
- [ ] 5.2 Record per-target failure without rewriting sibling originals on uncertainty. Verify preserve-original for the failed target only

## 6. Opt-in website audit with SSRF defense (later implement)

- [ ] 6.1 Require explicit opt-in before any remote fetch. Verify default-off refuses network
- [ ] 6.2 Block loopback, link-local, private, metadata, and non-http(s) targets. Verify remote negative controls
- [ ] 6.3 Enforce redirect hop caps with SSRF re-check, content-type allowlist, download caps, and request budgets
- [ ] 6.4 Limit sitemap expansion to configured host and path policy. Verify no crawl outside policy

## 7. Capabilities and registry (later implement)

- [ ] 7.1 Register `anthropies.audit-directory` and `anthropies.audit-website` in `builtinRegistry` and HTTP packs list
- [ ] 7.2 Extend capabilities tests for the new ids. Verify GET /health stays `{ "ok": true, "version": "0.3.0" }`
- [ ] 7.3 Run `pnpm test` and `pnpm exec tsc -p tsconfig.json --noEmit`
