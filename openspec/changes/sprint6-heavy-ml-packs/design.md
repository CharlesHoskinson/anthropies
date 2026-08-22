## Context

Sprint 0 kernel and Sprint 1 format packs are on `main`. Sprint 6 was blocked on licensing. The owner decided: distribute open-source upstream; otherwise implement the method in original Anthropies code.

## Goals / Non-Goals

**Goals:** Optional MarkLLM and MarkDiffusion packs that wrap Apache-2.0 upstream. Original CtrlRegen-method pack that does not copy unlicensed repos. Core remains usable when those packs are absent.

**Non-Goals:** Vendor-efficacy claims. Bundling models. Mixing scores into Report. Copying `noai-watermark` or `yepengliu/CtrlRegen` source.

## Decisions

1. **6C MarkLLM** wraps `THU-BPM/MarkLLM` Apache-2.0. Distribution is allowed with Apache notice. Same-configuration harness only. Statistical channel. Not an Anthropic or Gemini oracle.

2. **6B MarkDiffusion** wraps `THU-BPM/MarkDiffusion` Apache-2.0. Distribution is allowed with Apache notice. Detect and purify stay optional. Evidence stays residual-risk, not certified absence.

3. **6A CtrlRegen-method** is original Anthropies code. Do not vendor or submodule `yepengliu/CtrlRegen` or `mertizci/noai-watermark`. The paper describes the method. Hugging Face adapter weights tagged Apache-2.0 may be operator-downloaded. They SHALL NOT ship inside the core artifact. Stable Diffusion / ControlNet / DINOv2 weights stay operator-supplied.

4. **Publishable core** never contains optional-noncommercial or all-rights-reserved third-party trees. Compose profiles separate `harness` (MarkLLM, MarkDiffusion) from `heavy` (CtrlRegen-method runtime and models).

5. **Unavailable is fail-soft.** Missing Python, GPU, or weights report `unavailable` and do not change unrelated clean success.

## Risks / Trade-offs

Original 6A will take longer than a wrap. That is the cost of a missing upstream LICENSE. Adapter weights on Hugging Face being Apache-2.0 does not license the GitHub code that has no LICENSE file.
