# Changelog

## 1.0.0 DarioCyclovir — 2026-08-23

First production release.

Package, CLI, and plugin version is `1.0.0`. HTTP `GET /health` and `GET /capabilities` keep JSON `version` `"0.3.0"`. Kernel API is `1.0.0`. Sidecar protocol is `1.0.0`. Default Compose image tag remains `anthropies:0.3.0`.

### Added

- Capability-pack kernel with Inspector and Cleaner wrappers
- Format packs: Layer A, C2PA, PDF, HTML, Markdown, SVG, DOCX, ODT, XLSX, PPTX, EPUB, raster-strip, pdf-tools
- Audit packs: directory (bounded, fail-closed empty) and website (SSRF defenses)
- Detector packs: Gemini SynthID adapter and official detector adapter
- Rewrite-stylometry pack with loopback rewrite adapters
- Optional MarkLLM, MarkDiffusion, CtrlRegen-method, and image-scoring packs
- HTTP `/health`, `/capabilities`, `/inspect`, `/clean`, `/detect`, `/openapi.json`
- Compose profiles for optional packs
- Compatibility matrix in `docs/COMPATIBILITY.md`

### Honesty

This release does not prove the official Claude text detector will fail. It does not prove text is human-written. Absence of a mark does not prove Claude was uninvolved. There is no HTTP `/humanize`. Detection is not a clean certificate.
