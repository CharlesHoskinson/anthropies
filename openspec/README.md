# OpenSpec work packages

Anthropies uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for change packages and [EARS](https://www.jamasoftware.com/requirements-management-guide/writing-requirements/adopting-the-ears-notation-to-improve-requirements-engineering/) for requirement syntax.

Foreman still owns delivery: Grok implements, Codex Sol audits, Claude advises. OpenSpec is the package shape. EARS is the requirement grammar.

## Layout

- `openspec/specs/` — current agreed behavior after archive
- `openspec/changes/<name>/` — one in-flight package
  - `proposal.md` — why
  - `specs/<capability>/spec.md` — ADDED/MODIFIED/REMOVED requirements
  - `design.md` — how
  - `tasks.md` — implementer checklist

## EARS (required)

Write SHALL statements with fixed clause order. Do not mix two instructions in one sentence.

| Pattern | Form |
|---|---|
| Ubiquitous | The kernel SHALL \<response\>. |
| Event-driven | WHEN \<trigger\>, the kernel SHALL \<response\>. |
| State-driven | WHILE \<precondition\>, the kernel SHALL \<response\>. |
| Optional | WHERE \<feature is included\>, the kernel SHALL \<response\>. |
| Unwanted | IF \<unwanted condition\>, THEN the kernel SHALL \<response\>. |
| Complex | WHILE \<precondition\>, WHEN \<trigger\>, the kernel SHALL \<response\>. |

Scenarios use WHEN / THEN (and AND). They must fail a defective implementation.

## Sprint 0 packages

| Change | Status | Notes |
|---|---|---|
| `sprint0-kernel-strict-decode` | active | T1/T2 rework. Codex Sol BLOCKED default excess-property ignore. |
| `sprint0-capability-policy` | draft | T3. After kernel strict decode archives. |
| `sprint0-sidecar-protocol` | draft | T9. Parallel with policy after T2 archives. |

Remaining Sprint 0 tasks (T4 registry, T5 planner, T6 pipeline, T7 packs, T8 wire, T10 client, T11 capabilities HTTP, T12 contract fixtures) each get their own change after the packages they depend on archive. Do not start them while `sprint0-kernel-strict-decode` is open.

## Later sprints (ROADMAP.md)

One OpenSpec change per sprint deliverable, EARS in `specs/`:

- Sprint 1 deterministic format packs
- Sprint 2 audit and reporting
- Sprint 3 rewrite and stylometry
- Sprint 4 detector registry
- Sprint 5 image scoring sidecar
- Sprint 6A/B/C CtrlRegen, MarkDiffusion, MarkLLM
- Sprint 7 distribution

## Validate

```bash
openspec validate sprint0-kernel-strict-decode --strict
```
