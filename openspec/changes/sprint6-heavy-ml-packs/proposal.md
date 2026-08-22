## Why

Sprint 6 adds optional heavy ML packs. The owner rule is: if upstream is open source with a redistribution grant, wrap and distribute it as a separate pack. If upstream has no redistribution grant, Anthropies implements the method in original code and does not copy that source.

Measured licenses (2026-08-22):

- MarkLLM (`THU-BPM/MarkLLM`) Apache-2.0.
- MarkDiffusion (`THU-BPM/MarkDiffusion`) Apache-2.0.
- CtrlRegen official code (`yepengliu/CtrlRegen`) has no LICENSE file.
- The maintained CtrlRegen backend (`mertizci/noai-watermark`) has no LICENSE file and no `license` field in `pyproject.toml`.
- Hugging Face weights `yepengliu/ctrlregen` list Apache-2.0. The CtrlRegen paper lists CC BY-NC-SA 4.0.

## What Changes

- Freeze 6B and 6C as optional Apache-2.0 wraps. Do not copy their trees into the TypeScript core. Pin version or commit. Keep NOTICE.
- Freeze 6A as an original Anthropies implementation of the published CtrlRegen method. Do not copy `yepengliu/CtrlRegen` or `mertizci/noai-watermark` source.
- Keep the publishable core TypeScript-only. Heavy packs stay optional and independently installable.

## Non-goals

- Bundling MarkLLM, MarkDiffusion, or CtrlRegen into the core image.
- Treating MarkLLM as a vendor detector or a clean certificate.
- Copying unlicensed CtrlRegen or noai-watermark files.
- Automatic model download.
- Bumping HTTP `serviceVersion` off `0.3.0`.

## Capabilities

### New Capabilities

- `heavy-ml-packs`

## Impact

Optional sidecars and pack adapters under `src/packs/` and `src/sidecars/`, compose profiles, capability inventory, and contract tests. Core kernel files stay unchanged except registry and capabilities advertising.
