# Wave 1 FULL-BRANCH STYLE auditor note

Date: 2026-08-17
Role: STYLE (TypeScript/Effect style)
Scope: Full branch `e4a76b6..4419c7a` (23 commits). Focus: `src/`, `tests/`, `package.json`.
Spec: `docs/superpowers/specs/2026-08-16-anthropies-wave1-design.md` §5 / §9 / §16.3

## Verdict

**APPROVE**

- BLOCKER: 0
- MAJOR: 0
- NIT: 3

## STYLE gate (full branch)

Style fails on Effect 4, forbidden imports, shared AppR, Fail/Finding mix, non-`@effect/cli` argv, or an HTTP service.

| Check | Result | Cite |
|---|---|---|
| Effect 3, not 4 | PASS | `package.json:26` `effect@^3.22.1`. Lockfile pins `effect@3.22.1`. ESM, Node `>=22`, `0.2.0`. tsconfig: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `NodeNext`, `verbatimModuleSyntax`. |
| Forbidden imports | PASS | No `node:fs` / `fs/promises` / `node:child_process` / `node:http` / `fetch` / `process.env` / `console.log` / `Effect.runPromise` / `any` / `as unknown as` / default exports in `src/` or `tests/`. `process.argv` only at `CliCommand.run` (`cli.ts:195`). `node:crypto` / `node:url` are not forbidden. eslint locks the set (`eslint.config.js:3-61`). |
| Fail ≠ Finding | PASS | Seven `Schema.TaggedError` Fails in `fail.ts`. CLI `failTags` → exit 2 (`cli.ts:42-49,186-188`). `ResidualHits` is CLI-only exit 1, not a Fail. Missing qpdf/exiftool → Finding + `degraded: true` (`pdf.ts:78-79`, `reporter.ts:92-103`). Official unavailable is a Finding / `OfficialUnavailable`, no score. |
| Per-command R | PASS | No typed AppR. Inspect/clean/humanize do not require `HttpClient`. `NodeHttpClient.layer` only on `capture` / `demo` (`cli.ts:136,139`). Capture `R` is `FileSystem \| HttpClient` after allowlist + key (`capturer.ts:81-98`). `classify` / Layer A / format handlers / Report type-check with HttpClient absent. Default `pnpm test` constructs HttpClient only inside `LIVE=1` (`live-capture.test.ts:13-28`). |
| `@effect/cli` | PASS | `CliCommand.make` + Options/Args + `withSubcommands` + `run` + `NodeRuntime.runMain` + `NodeContext.layer` (`cli.ts:1-4,145-157,194-197`). No commander/yargs/minimist. `Command` from platform is aliased `ProcCommand` (`pdf.ts:1`). |
| No HTTP service | PASS | No express/fastify/hono/OpenAPI/Docker. Outbound `HttpClient` is capture/demo Live only. Process is a CLI. |

## Findings

### BLOCKER

None.

### MAJOR

None.

### NIT

1. **spec §5.1 Test layers** — Services expose `Default` only. Same residual as Tasks 3–7. Does not change the gate.
2. **inspect/clean inferred R** — `Inspector` / `Cleaner` are one method each; inferred `R` is the union of format branches, so `CommandExecutor` is present even on text. Not a shared AppR; HttpClient stays absent. Spec minimum for text is FileSystem.
3. **Dispatch** — `handlerFor` is a `Partial<Record>` (`registry.ts:63-91`), not `Match.valueTags`. Handlers remain per-format files. Classify is still a pure `(bytes, suffix) → Kind`.

## Not defects

- `Layer.mergeAll` at `NodeRuntime.runMain` is the process runner (spec §4), not AppR. HttpClient is provided on the capture/demo handlers only.
- `pnpm-workspace.yaml` is allowBuilds-only (pnpm 11), not a workspace split.
- PDF sibling temps and capture `orDie` after allowlist are prior nits; Fail set stays §9.1.
- `Console.log` for `--json` stdout is allowed.

## Conclusion

Full branch matches spec §5 / §9 and the STYLE hard gate: Effect 3, no forbidden imports, Fail≠Finding, per-command R, `@effect/cli`, no HTTP service. APPROVE.
