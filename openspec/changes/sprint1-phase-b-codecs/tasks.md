## 1. Freeze gate (this unit)

- [x] 1.1 Write `proposal.md`, `design.md`, `tasks.md`, and `specs/phase-b-codecs/spec.md` under `openspec/changes/sprint1-phase-b-codecs/`
- [x] 1.2 Write `docs/superpowers/plans/2026-08-22-sprint1-phase-b-codecs.md`
- [x] 1.3 Run `openspec validate sprint1-phase-b-codecs --strict` and verify exit 0
- [x] 1.4 Do not git commit in the freeze unit. Do not add Phase B pack sources in the freeze unit

## 2. Raster codecs (later implement)

- [ ] 2.1 Add BMP and TIFF to `rasterCodec` and classify tests. Verify `pnpm test` covers BM / II* / MM* magics
- [ ] 2.2 Implement WebP, AVIF, and HEIC hard-bound metadata inspect and strip. Verify applicable present and absent fixtures. Verify undecodable HEIC is not certified absent
- [ ] 2.3 Implement GIF, BMP, and TIFF metadata inspect and strip. Verify XMP or EXIF provenance controls and non-applicable unchanged digest
- [ ] 2.4 Assert Phase B raster sources do not register markClass `pixel` and do not alter pixel samples for mark removal

## 3. OOXML office kinds (later implement)

- [ ] 3.1 Add Kind literals `xlsx` and `pptx` and classify PK+suffix tests
- [ ] 3.2 Extract shared OOXML helpers and implement xlsx format plus `anthropies.xlsx` pack. Verify no full-zip UTF-8 Layer A decode
- [ ] 3.3 Implement pptx format plus `anthropies.pptx` pack. Verify docProps scrub and zip cap refusal

## 4. EPUB (later implement)

- [ ] 4.1 Add Kind literal `epub` and classify PK+`.epub` tests
- [ ] 4.2 Implement epub format plus `anthropies.epub` pack for OPF metadata. Verify no full-zip UTF-8 Layer A decode
- [ ] 4.3 Verify EPUB zip-bomb fixtures fail closed under the existing expansion cap

## 5. Structural PDF (later implement)

- [ ] 5.1 Replace latin1 whole-file false positives with structure-aware inspect tests
- [ ] 5.2 Keep tool-missing strip degraded and not certified absent. Verify tool-present strip labels
- [ ] 5.3 Keep `pdfPack` as inspect owner. Do not register a second PDF inspect owner

## 6. Capabilities and registry (later implement)

- [ ] 6.1 Register `anthropies.xlsx`, `anthropies.pptx`, and `anthropies.epub` in `builtinRegistry` and HTTP packs list
- [ ] 6.2 Extend `tests/http-capabilities.test.ts` for the new ids. Verify GET /health stays `{ "ok": true, "version": "0.3.0" }`
- [ ] 6.3 Keep `layerAPack.artifactKinds` equal to `["text", "svg", "html", "md"]`
- [ ] 6.4 Run `pnpm test` and `pnpm exec tsc -p tsconfig.json --noEmit`. Assert Phase B packs have no `score` or `watermarkScore`
