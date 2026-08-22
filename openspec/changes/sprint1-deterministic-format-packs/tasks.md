## 1. Phase A — wrap existing handlers

- [ ] 1.1 html/md metadata packs wrapping inspectHtmlText/cleanHtmlText and inspectMdText/cleanMdText
- [ ] 1.2 svg-strip remove-only pack wrapping cleanSvgText
- [ ] 1.3 docx/odt packs wrapping inspectDocx/cleanDocx and inspectOdt/cleanOdt
- [ ] 1.4 raster-strip remove-only pack wrapping stripRasterBytes
- [ ] 1.5 pdf-tools remove-only pack wrapping PdfTools with degraded probe
- [ ] 1.6 builtinRegistry and GET /capabilities list each new pack
- [ ] 1.7 Inspector still names inspectDocx inspectOdt inspectHtmlText inspectMdText

## 2. Phase B — new codecs (after Phase A archives)

- [ ] 2.1 WebP AVIF HEIC BMP GIF TIFF
- [ ] 2.2 XLSX PPTX via OOXML primitives
- [ ] 2.3 EPUB
- [ ] 2.4 Structural PDF
