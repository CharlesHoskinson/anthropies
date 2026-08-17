---
name: purge-anthropies
description: >
  Use when the user asks to purge anthropies, strip Co-Authored-By Claude,
  strip Generated-with banners, inspect owned files for vendor marks,
  clean hard-bound C2PA metadata from owned png/jpg/svg (and other supported files),
  or runs /purge-anthropies or /anthropies.
  Does not claim official watermark removal.
---

# Purge Anthropies

Restore clean title in Outputs the user already owns. The Claude text mark is a SynthID-class keyed sampler. It is the wording. Hidden-character strip does not touch it.

`humanize` is title restoration: a best-effort wording rewrite on a non-origin model. Residual statistical risk remains. print-prompt does not destamp. This is not an official-kill.

## Hard rules

- Do not rewrite with Claude, Gemini, or any origin/watermarked vendor. That re-stamps the mark.
- Do not claim official-detector failure. There is no public Claude detector.
- Do not synonym-swap in place. That leaves H-grams intact.
- Deterministic clean first. Humanize second.

## Procedure

1. Resolve the target: path, selection, or commit message the user named.

2. Prefer the local HTTP service for inspect/clean.

`ANTHROPIES_SERVICE_URL` defaults to `http://127.0.0.1:8765`. The process that owns FileSystem is `anthropies serve` (loopback `127.0.0.1:8765` unless the operator passed `--host` / `--port`):

```
npx anthropies serve
```

From this repo after `pnpm build`: `node dist/cli.js serve`.

Health-check first:

```
: "${ANTHROPIES_SERVICE_URL:=http://127.0.0.1:8765}"
curl -sS -f "$ANTHROPIES_SERVICE_URL/health"
```

Expected: `{"ok":true,"version":"0.3.0"}`. If health fails, say so. Do not invent a successful HTTP result. If the operator required the service, stop and report the failure. Otherwise use the local CLI fallback:

```
npx anthropies clean --in-place <path>
```

If the package is not installed, run it from the repo after `pnpm build`: `node dist/cli.js clean --in-place <path>`.

When health succeeds, POST base64. If `ANTHROPIES_SERVER_API_KEY` is set, add `-H "Authorization: Bearer $ANTHROPIES_SERVER_API_KEY"`:

```
file_b64=$(base64 < <path> | tr -d '\n')
name=$(basename <path>)

# inspect → { ok, kind, report }
curl -sS -X POST "$ANTHROPIES_SERVICE_URL/inspect" \
  -H "Content-Type: application/json" \
  -d "{\"file\":\"$file_b64\",\"name\":\"$name\"}"

# clean → { ok, kind, report, cleaned }  (cleaned is base64; Layer A / hard-bound metadata only)
curl -sS -X POST "$ANTHROPIES_SERVICE_URL/clean" \
  -H "Content-Type: application/json" \
  -d "{\"file\":\"$file_b64\",\"name\":\"$name\"}"
```

There is no HTTP `/humanize`. Official stays `unavailable` unless `ANTHROPIC_DETECT_URL` is set. This run does not prove the official Claude text detector will fail.

3. Classify the file.
   - Commit message / PR body: stop after clean. Trailers and banners are the mark.
   - Code: humanize **comments, docstrings, and free strings only**. Do not rename public APIs. Do not rewrite lockfiles, generated stubs, or snapshots.
   - Prose / markdown: humanize the prose outside fences. Leave fenced code, tables of facts, URLs, and citations.

4. Humanize without the origin model. Humanize is CLI-only.

If the current host is Claude or Gemini, do **not** rewrite in this session. Run:

```
ANTHROPIES_REWRITE_BACKEND=print-prompt npx anthropies humanize <path>
```

print-prompt prints a rewrite prompt. It does not destamp. Then execute that prompt on a **local unmarked** model (Ollama / local Llama / Qwen / Mistral / DeepSeek with watermarking off). Optional:

```
ANTHROPIES_REWRITE_BACKEND=ollama ANTHROPIES_REWRITE_MODEL=llama3.2 npx anthropies humanize --in-place <path>
```

If the current host is already unmarked (Grok, local open-weight, etc.), rewrite in-session:

- Change clause order, sentence boundaries, discourse markers, and function words.
- Target well under 50% surviving 5-grams.
- Keep facts, numbers, names, URLs, and code fences.
- For code, rewrite comment wording only unless the user opted into local-identifier rename.

5. Report to the user:

- what deterministic marks were removed
- whether inspect/clean ran over HTTP (`ANTHROPIES_SERVICE_URL`) or the local CLI fallback
- whether a rewrite ran, and on which backend
- residual risk: statistical marks may remain; title restoration is best-effort; this is not an official-detector certificate and not an official-kill

## Do not

| Move | Why |
|---|---|
| Ask Claude to "make this unmarked" | Re-stamps the same keyed sampler |
| Light copy-edit / prettier-only | H-gram islands survive |
| Touch lockfiles, `go.sum`, protobufs | No free tokens; high breakage |
| Patch Claude Code request apostrophes | Different problem (outbound client steg) |
| Claim official-detector failure | Official stays unavailable unless a URL is set |

## Additional resources

- `references/mark.md` — how the mark works
- Start the service: `npx anthropies serve` (default `http://127.0.0.1:8765`)
- Discover routes: `GET $ANTHROPIES_SERVICE_URL/openapi.json`
- Repo CLI: `npx anthropies --help` or `node dist/cli.js --help`
