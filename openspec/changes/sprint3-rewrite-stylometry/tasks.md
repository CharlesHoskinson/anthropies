## 1. Freeze gate (this unit)

- [x] 1.1 Write `proposal.md`, `design.md`, `tasks.md`, and `specs/rewrite-stylometry/spec.md` under `openspec/changes/sprint3-rewrite-stylometry/`
- [x] 1.2 Run `openspec validate sprint3-rewrite-stylometry --strict` and verify exit 0
- [x] 1.3 Do not git commit in the freeze unit. Do not add rewrite pack sources in the freeze unit

## 2. Print-prompt default and origin blocklist (later implement)

- [ ] 2.1 Keep unset rewrite backend as `print-prompt`. Verify metric status `not-run` and the does-not-destamp denial
- [ ] 2.2 Refuse backends or models containing `claude`, `anthropic`, `gemini`, `google-gemini`, or `synthid`. Verify bytes unchanged on OriginBlocked
- [ ] 2.3 Keep prose and code prompts requiring clause-order / H-gram break and fact, URL, fence preservation

## 3. Optional Ollama and OpenAI-compatible loopback (later implement)

- [ ] 3.1 Implement Ollama generate and OpenAI-compatible chat adapters behind HttpClient. Verify fake-client unit tests without live models
- [ ] 3.2 Fail closed on non-loopback rewrite URLs unless `ANTHROPIES_REWRITE_ALLOW_REMOTE=1`. Verify remote-denied control
- [ ] 3.3 Do not bundle language model weights. Verify package contents exclude model blobs

## 4. Multi-candidate rewrite and lexical selection (later implement)

- [ ] 4.1 Produce multiple non-origin candidates on configured HTTP rewrite backends. Verify per-candidate observation records exist
- [ ] 4.2 Select the winning candidate with lexical or five-gram criteria only. Verify detector scores do not change the winner
- [ ] 4.3 Keep selection working when detectors are absent or unavailable

## 5. Five-gram and stylometry observation states (later implement)

- [ ] 5.1 Emit five-gram overlap status `not-run` for print-prompt and skipped rewrite
- [ ] 5.2 Emit `insufficient` for code domain and for prose with fewer than 200 Unicode letter tokens
- [ ] 5.3 Emit `computed` only after a real prose rewrite with at least 200 tokens. Verify surviving ratio is null outside `computed`
- [ ] 5.4 Emit stylometric observations with the same three statuses. Verify neither observation is a CI pass bar or official-removal certificate

## 6. Honesty, capabilities, and registry (later implement)

- [ ] 6.1 Register `anthropies.rewrite-stylometry` in `builtinRegistry` and HTTP packs list without adding `/humanize`
- [ ] 6.2 Extend capabilities tests for the new id. Verify GET /health stays `{ "ok": true, "version": "0.3.0" }`
- [ ] 6.3 Assert rewrite pack sources and fixtures do not contain `watermarkScore`, official-kill claims, or bundled models
- [ ] 6.4 Run `pnpm test` and `pnpm exec tsc -p tsconfig.json --noEmit`
