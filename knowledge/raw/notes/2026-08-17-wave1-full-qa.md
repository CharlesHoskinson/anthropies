# Wave 1 full-branch QA auditor note

Date: 2026-08-17
Role: QA
Scope: Full branch `feat-wave1-effect-core` vs spec §16.2
Verdict: APPROVE
Diff: `e4a76b6..4419c7a`

## Checks (this persona)

| Check | Result |
|---|---|
| Named tests from spec §16.2 | PASS |
| `--json` purity | PASS |
| residual exit | PASS |
| official unavailable | PASS |
| no official-detect lie | PASS |
| Python gone | PASS |

## Named tests (§16.2)

| Test | File | Result |
|---|---|---|
| `cert_layer_a_roundtrip` | `tests/cert-layer-a.test.ts` | PASS (unit; bidi + second inspect NIT) |
| `cert_c2pa_png_jpeg_svg` | `tests/cert-c2pa.test.ts` | PASS |
| `cert_c2patool_false_positive` | `tests/cert-c2pa.test.ts` | PASS (`No claim found` / `No JUMBF`; tool absent does not fail) |
| `json_stdout_purity` | `tests/json-stdout.test.ts` | PASS |
| `residual_exit_not_suppressed` | `tests/residual-exit.test.ts` | PASS |
| `official_unavailable_default` | `tests/official-unavailable.test.ts` | PASS |
| `official_claim_forbidden` | `tests/official-claim-forbidden.test.ts` | PASS |
| `binary_guard_docx_png_stdin` | `tests/binary-guard.test.ts` | PASS (PNG/DOCX; stdin NIT) |
| `zip_bomb_and_caps` | `tests/zip-caps.test.ts` | PASS (patched 16-byte cap + claimed-huge DOCX) |
| `origin_blocklist` | `tests/origin-blocklist.test.ts` | PASS |
| `humanize_print_prompt_default` | `tests/humanize-print-prompt.test.ts` | PASS (`not-run`, no removal claim) |
| `premark_unknown_model` | `tests/premark-model.test.ts` | PASS (empty allowlist valid) |
| `live_capture_smoke` | `tests/live-capture.test.ts` | PASS (`test:live` only; skip unless LIVE+key+ID) |
| `demo_honesty` | `pnpm demo` script, not CI | PASS (correct; `official_claim_forbidden` locks table copy) |
| `write_guard` | `tests/write-guard.test.ts` | PASS |

## Surfaces

- `--json`: `Reporter.print` writes honesty to `Console.error`, then one `Schema.encode` line to `Console.log`. `json_stdout_purity` `JSON.parse`s inspect stdout, decodes `Report`, exit 1 on planted trailer. Human/json exit equality is locked on inspect leftover in `residual-exit.test.ts`.
- Residual: `residualDrivesExit` is true when deterministic or c2pa is `present` and `degraded` is false. CLI inspect/clean/humanize raise `ResidualHits` → teardown 1. Inspect planted C2PA exits 1 in both modes. Successful strip exits 0. PDF missing-tool `degraded: true` does not drive 1 (`cert-pdf.test.ts`).
- Official: every report builder hard-codes `OfficialUnavailable`. No `"score"` on encode. Injected score fails Schema. Honesty: `unavailable (ANTHROPIC_DETECT_URL unset)` + does-not-prove official detector / human-written.
- No official-detect lie: CLI help never a single watermark score; clean "does not remove the keyed text mark"; demo "never claims official text-kill"; skill/slash deny official-detector failure.
- Python: `src/anthropies/`, `pyproject.toml`, `tests/test_clean.py`, `tests/test_humanize.py` gone. Skill/commands/README use `npx anthropies` / `node dist/cli.js`. Remaining `python3 -m` mentions are spec/plan/historical notes only. `docs/legal/audit.py` is the citation auditor, not the CLI.

## Findings

BLOCKER: none

MAJOR: none. Spec §16.3 fail conditions (missing named tests, `--json` impurity, residual exit laundering, official-claim copy) are not met.

NIT: `cert_layer_a_roundtrip` does not plant invalid bidi or re-inspect for zero deterministic hits. `applyLayerA` still strips `\u202A-\u202E`.

NIT: `residual_exit` "clean that leaves planted c2pa" is a `residualDrivesExit` unit case, not a CLI `clean` that fails to strip. Inspect leftover + clean success are subprocess-tested. Product wires residual on clean.

NIT: `binary_guard` names stdin; no stdin-PNG / JPEG / PDF / `utf-8`+`cp1252` sniff. Family-1 brief was PNG + DOCX PK + `--force-text`.

NIT: `official_claim_forbidden` does not scan CLI help or assert CI unsets `ANTHROPIC_DETECT_URL`. There is no GitHub workflow. `anthropicDetectUrl` is Config-only and unused; honesty always says unset.

## Not done (correct)

HTTP service, Docker, MarkLLM, pixel. Official adapter stays stub. Demo is not a CI gold test. Version `0.2.0`.
