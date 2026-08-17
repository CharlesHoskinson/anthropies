# PR #5 fix — do not certify C2PA absent on unparsed rasters

Date: 2026-08-17
Role: implementer
Task: PR #5 MAJOR

Honesty stanza `c2pa:` may only be `present | absent | removed | not-applicable`.

WebP / AVIF / HEIC / GIF classify as `raster` but have no parser. Inspect/strip now return `applicable: false`. Finding status is `degraded`, stanza is `c2pa: not-applicable`. Never `present: false` as a certificate of absence.

PNG/JPEG unchanged. No WebP/AVIF/HEIC parsers added.
