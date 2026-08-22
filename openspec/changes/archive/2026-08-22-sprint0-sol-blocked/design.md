## Context

Sol integration audit BLOCKED after Sprint 0 landed on main. Inspector classified-kind is already fixed on main.

## Goals / Non-Goals

**Goals:** Optional unavailable packs do not fail Layer A inspect. Unchanged transforms stay unchanged. Sidecar decode binds digest and rejects score. Raster parse failure is not certified absent. Self before/after is conflict.

**Non-Goals:** New formats. Changing public Report.

## Decisions

Pipeline calls pack.probe before inspect/transform. Skip when status is unavailable and isOptionalFailSoft is true. Fail when a required pack is unavailable. Remediation changed only when output digest differs from the transform input digest.

## Risks / Trade-offs

Builtin packs probe available today; fail-soft is proven with a test pack.
