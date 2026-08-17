# Task 2 implementer note (Effect scaffold)

Date: 2026-08-17
Role: implementer
Task: Effect scaffold (Family 1 start)

## What I changed

- Created `package.json` at version `0.2.0` with the locked product sentence, `"type": "module"`, `bin.anthropies` → `./dist/cli.js`, `engines.node: ">=22"`, and scripts `build` / `test` / `test:live` / `demo`.
- Pinned Effect 3 latest stable: `effect@3.22.1`, `@effect/cli@0.77.0`, `@effect/platform@0.97.1`, `@effect/platform-node@0.108.1`. Not Effect 4 (`latest` is 3.22.1; 4 is `rc` / `beta`).
- Created `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `module`/`moduleResolution` `NodeNext`, `verbatimModuleSyntax`, `outDir` `dist`, `rootDir` `src`.
- Created `eslint.config.js` forbidding `node:fs`, `node:child_process`, `node:http`, `fetch`, `process.env`, `process.argv` (except `src/cli.ts` for `CliCommand.run`), `console.log`, `Effect.runPromise` in library code, `any`, and default exports.
- Created `src/fail.ts` `Schema.TaggedError` types: `BinaryInput`, `OriginBlocked`, `MissingApiKey`, `PreMarkModel`, `DecodeError`, `WriteGuard`, `InputTooLarge`.
- Created `src/kind.ts` `Kind` literal union from spec §6.
- Created `src/report.ts`: `Report` Schema.Class with no `suspicious`; `removed` nested per channel; `OfficialFinding` tagged union with no `score` on `Unavailable`; `honestyStanza` emits the spec §8 lines including the two does-not-prove denials.
- Created `src/config.ts`: all spec §5.3 knobs as `Config`. Unset `ANTHROPIC_DETECT_URL` is `Config.option`, not a throw. No `process.env`.
- Created `src/cli.ts`: `@effect/cli` `CliCommand` + subcommands `inspect | clean | humanize | capture | demo` + `NodeRuntime.runMain` + `NodeContext.layer`. Handlers are Finding-free stubs.
- Created `tests/official-claim-forbidden.test.ts` first (TDD RED: `pnpm test` failed with no `package.json`). GREEN after scaffold.
- Modified `.gitignore`: `node_modules/`, `fixtures/live/*` keeping `.gitignore`, `graphify-out/` already present.
- Modified `NOTICE`: WR MIT block + reproduced MIT text.
- Added `pnpm-workspace.yaml` `allowBuilds` so pnpm 11 will run the esbuild postinstall. pnpm 11 no longer reads a `package.json` `pnpm` field.

## Why

Family 1 cannot start without an Effect 3 ESM package, Fail types, Report schema, Config, and a CliCommand edge. The claim-forbidden test locks the honesty stanza before any command logic exists.

## Residual risks

- pnpm 11 requires `pnpm-workspace.yaml` `allowBuilds` or `pnpm install` exits 1 on ignored build scripts. This file is not in the task’s original file list. It is not a workspace split (`packages` is unset).
- Auditor trio not dispatched. Parent: do not dispatch. Self-reviewed STYLE/QA/DOCS.
- CLI handlers are stubs. `--help` lists the five names; they do not inspect or write.
- Plugin version remains `0.1.0`. Python `src/anthropies/` remains. Both are later tasks.
- `src/cli.ts` reads `process.argv` only to pass it to `CliCommand.run`, which returns `(args) => Effect`.

## Almost did, did not

- Almost installed Effect 4 from `rc`. Did not. `npm view effect dist-tags.latest` is `3.22.1`.
- Almost used `process.env` in `config.ts`. Did not. `Config.option` / `Config.withDefault` only.
- Almost added a `suspicious` field or mixed `removed` bag. Did not.
- Almost claimed official-detector failure in CLI help. Help copy is the spec §13 sense.
- Almost dispatched STYLE/QA/DOCS subagents. Parent instruction: do not dispatch.
