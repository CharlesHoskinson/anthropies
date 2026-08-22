## Context

Sprints 0 through 5 freeze kernel contracts and pack surfaces. ROADMAP Sprint 7 owns installation and operations after those APIs settle. The repo already ships a TypeScript core image and a loopback-only `compose.yaml` without Compose profiles. Sidecar protocol is `1.0.0`. HTTP health stays `0.3.0`. See proposal.md for why this freeze exists.

## Goals / Non-Goals

**Goals:** Freeze OpenSpec for Compose profiles, health and capability discovery, independently installable pack artifacts, a compatibility matrix that covers kernel ranges and current plus previous sidecar protocol versions, TypeScript-only publishable core, and explicit bans on monolithic all-model images and automatic model download.

**Non-Goals:** Implement packaging in this unit. Bump HTTP or sidecar protocol versions. Bundle every optional model into one image. Download models without an explicit operator action.

## Decisions

1. **Local-only is the default Compose profile.** The default profile starts the TypeScript core service only. Licensed and heavy optional packs stay off until an operator selects their profile or install path.

2. **Licensed packs use separate profiles.** Each licensed or optional heavy pack that needs Compose gets its own profile or an additive profile fragment. Enabling one licensed pack does not enable unrelated optional packs.

3. **Health and capabilities are the discovery surface.** Core exposes GET `/health` and GET `/capabilities`. Optional sidecars keep protocol health and capabilities. Operators discover what is installed and available through those endpoints, not through guessed image contents.

4. **Pack artifacts install independently.** Each optional pack ships as its own installable artifact with pin digests when it carries models or sidecars. Core install does not require any optional pack artifact.

5. **Compatibility matrix is explicit.** Distribution publishes a matrix of kernel API versions, pack ids with kernel ranges, and sidecar protocol versions. The matrix includes the current sidecar protocol and every previous protocol version that was ever published for Anthropies sidecars. Supported cells pass. Unsupported cells report explicit incompatibility.

6. **No monolithic all-model image.** Release images omit bulk optional model weights. A build that embeds every optional model and sidecar fails distribution acceptance.

7. **No automatic model download.** Install, image build, and service startup SHALL NOT fetch model weights unless the operator runs an explicit documented download or enable step.

8. **Core stays TypeScript-only.** The publishable core package and default core image contain TypeScript/Node runtime artifacts only. Python sidecars and noncommercial weights stay in optional pack distribution.

9. **HTTP serviceVersion stays `0.3.0`.** Health JSON stays `{ ok: true, version: "0.3.0" }` unless a separate contract change bumps it. Capabilities `version` stays `0.3.0` under the same rule.

10. **Documentation is part of distribution.** CLI, HTTP, skill, operator, security, and troubleshooting docs describe profiles, discovery, independent installs, the matrix, and the no-autodownload rule.

## Risks / Trade-offs

- [Operators expect one image with every model] → Document local-only default and independent pack install. Fail acceptance on monolithic all-model images.
- [Previous protocol fixtures drift] → Keep previous protocol goldens or matrix rows even after a newer protocol ships. Unsupported versions must still report incompatibility.
- [Silent network pulls during CI or startup] → Contract tests forbid model fetch on default install and default compose up.
- [HTTP version drift while packaging] → Golden tests lock health and capabilities `version` to `0.3.0`.
- [Licensed code leaking into core] → Core inventory tests fail when optional licensed or noncommercial trees are present.

## Migration Plan

This change freezes OpenSpec only. Later implement work adds Compose profiles, pack artifacts, matrix files, docs, and failing-then-passing contract tests. Rollback before archive is deletion of this change directory. After archive, revert the implementing PR if distribution misbehaves. Operators who stay on the default local-only profile keep TypeScript-only core behavior.

## Open Questions

None that block this freeze. Exact Compose profile names, pack artifact filenames, and matrix file path wait for the implement change.
