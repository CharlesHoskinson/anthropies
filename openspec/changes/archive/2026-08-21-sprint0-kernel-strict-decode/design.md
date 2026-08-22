## Context

T1 and T2 landed schemas that match the named types. Codex Sol and Claude Fable blocked them because Effect Schema defaults to ignoring excess properties. Tests hid that by passing `{ onExcessProperty: "error" }` only at the call site.

`src/report.ts` stays frozen. OfficialFinding remains the public official schema.

## Goals / Non-Goals

**Goals:**

- Make kernel Schema classes fail closed on unknown keys by default.
- Bind Artifact digest to a copy of bytes.
- Add known-bad controls for `suspicious`, `score`, `watermarkScore`, missing `kernelApiMax`, and digest mismatch.

**Non-Goals:**

- Do not change public Report, CLI, or HTTP.
- Do not implement T3–T12.

## Decisions

- Use Schema-level excess-property rejection (Effect `annotations` or a shared `strictClass` helper) so callers cannot forget the option.
- Copy `bytes` in `makeArtifact` with `Uint8Array.from(bytes)` (or equivalent) before hashing.
- Filter Artifact decode with a check that `createHash("sha256").update(decoded.bytes).digest("hex") === decoded.digest`.
- Leave OfficialFinding tests in `tests/official-unavailable.test.ts` as the public-report control. Kernel tests do not own OfficialFinding production behavior.

## Risks / Trade-offs

- Strict decode on CapabilityManifest will reject future unknown keys. That is intended for Contract v1.
- Copying bytes costs memory. Artifact size is already capped at 256 MiB later in the pipeline.
