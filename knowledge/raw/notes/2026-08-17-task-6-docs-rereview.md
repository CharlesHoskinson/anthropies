# Task 6 docs re-review (honesty stanza fix)

Date: 2026-08-17
Role: docs auditor
Task: Task 6 DOCS MAJOR re-review
Diff: 5091d86..397b4d8 (`397b4d8`)

## Verdict

MAJOR ADDRESSED. NITs unchanged (not in this fix). No new docs breakage.

## Prior findings

- MAJOR — PDF inspect/clean wrote `c2pa: degraded` on the locked honesty line. ADDRESSED.
  - `inspector.ts` now stanzas `present` / `absent` from `inspected.present`.
  - Degraded PDF clean stanzas `present` if markers remain, else `absent`. Successful strip still uses `removed`.
  - `makeContainerReport` honesty union is `present | absent | removed | not-applicable`.
  - Finding `c2pa` status `degraded` and `report.degraded` stay. Extra warning line stays.
  - `cert_pdf_degraded` rejects `/^c2pa: degraded$/m` and locks `present` / `absent`.
- NIT — Implementer self-review listed `degraded` as a c2pa honesty verb. ADDRESSED in the new fix note (correct contract). Historical implementer note not rewritten.
- NIT — HTML/MD ride the `c2pa` channel. NOT ADDRESSED. Out of this fix.
- NIT — SVG it-string is not `removesHardBoundC2paFromSvg`. NOT ADDRESSED. Forbidden name still absent.

## New breakage

None. Fix copy does not claim official-kill, destamp, or `watermark removed`. Stanza still emits the three denials via `honestyStanza`.
