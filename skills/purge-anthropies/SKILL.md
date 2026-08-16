---
name: purge-anthropies
description: >
  Use when the user asks to purge anthropies, strip a Claude watermark,
  humanize Claude output, destamp SynthID-class text, remove Co-Authored-By Claude,
  clean C2PA from a Claude file, or runs /purge-anthropies or /anthropies.
---

# Purge Anthropies

Restore clean title in Outputs the user already owns. The Claude text mark is a SynthID-class keyed sampler. It is the wording. Hidden-character strip does not touch it.

## Hard rules

- Do not rewrite with Claude, Gemini, or any origin/watermarked vendor. That re-stamps the mark.
- Do not claim the official detector will fail. There is no public Claude detector.
- Do not synonym-swap in place. That leaves H-grams intact.
- Deterministic clean first. Humanize second.

## Procedure

1. Resolve the target: path, selection, or commit message the user named.
2. Run the cleaner:

```
python3 -m anthropies clean --in-place <path>
```

If the package is not on PYTHONPATH, run it from the repo: `PYTHONPATH=src python3 -m anthropies clean --in-place <path>`.

3. Classify the file.
   - Commit message / PR body: stop after clean. Trailers and banners are the mark.
   - Code: humanize **comments, docstrings, and free strings only**. Do not rename public APIs. Do not rewrite lockfiles, generated stubs, or snapshots.
   - Prose / markdown: humanize the prose outside fences. Leave fenced code, tables of facts, URLs, and citations.

4. Humanize without the origin model.

If the current host is Claude or Gemini, do **not** rewrite in this session. Run:

```
ANTHROPIES_REWRITE_BACKEND=print-prompt python3 -m anthropies humanize <path>
```

Then execute that prompt on a **local unmarked** model (Ollama / local Llama / Qwen / Mistral / DeepSeek with watermarking off). Optional:

```
ANTHROPIES_REWRITE_BACKEND=ollama ANTHROPIES_REWRITE_MODEL=llama3.2 python3 -m anthropies humanize --in-place <path>
```

If the current host is already unmarked (Grok, local open-weight, etc.), rewrite in-session:

- Change clause order, sentence boundaries, discourse markers, and function words.
- Target well under 50% surviving 5-grams.
- Keep facts, numbers, names, URLs, and code fences.
- For code, rewrite comment wording only unless the user opted into local-identifier rename.

5. Report to the user:

- what deterministic marks were removed
- whether a rewrite ran, and on which backend
- residual risk: statistical marks may remain; this is not an official-detector certificate

## Do not

| Move | Why |
|---|---|
| Ask Claude to "make this unmarked" | Re-stamps the same keyed sampler |
| Light copy-edit / prettier-only | H-gram islands survive |
| Touch lockfiles, `go.sum`, protobufs | No free tokens; high breakage |
| Patch Claude Code request apostrophes | Different problem (outbound client steg) |

## Additional resources

- `references/mark.md` — how the mark works
- Repo CLI: `python3 -m anthropies --help`
