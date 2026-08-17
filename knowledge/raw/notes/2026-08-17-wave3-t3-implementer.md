# Wave 3 Task 3 implementer note (Family 3 title-restoration copy)

Date: 2026-08-17
Role: implementer
Task: README/skill humanize section names title restoration + residual risk

## What I changed

- README: new `### Humanize (title restoration)` under How to run. Names title restoration, residual statistical risk, print-prompt does not destamp, not an official-kill.
- Skill: humanize is title restoration; residual risk; print-prompt does not destamp; not an official-kill. YAML trigger still denies official watermark removal.
- CLAIMS.md: added a `humanize` row. CLI help sense now names title restoration. `destamp` stays forbidden as a capability; the denial `print-prompt does not destamp` is required.
- CLI `humanize` help matches CLAIMS: title restoration, best-effort, refuses Claude and Gemini, print-prompt does not destamp.
- Honesty box, manifesto, and `docs/legal/` unchanged.

## Why

Wave 3 Family 3 is product copy. Leapfrog is Claude title restoration, not detector-kill. print-prompt still does not destamp.

## Residual risks

- Statistical marks may remain after a real rewrite. Never a certificate.
- print-prompt still returns the prompt + Layer-A text and `rewrite_metric.status = not-run`.
- Family 4 full-diff trio / PR not done. Parent: do not dispatch auditors; do not open a PR.

## Almost did, did not

- Almost claimed destamp / undetectable / official-kill as a capability. Did not.
- Almost rewrote the honesty box or manifesto. Spec: they stay.
- Almost touched `.worktrees/feat-wave2-service` or `src/http/`. Did not.
- Almost dispatched STYLE/QA/DOCS. Parent instruction: do not dispatch.
