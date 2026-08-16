# How the Claude mark works

- Official (2026-08-14): SynthID-Text variant. Changes the source of randomness among equally-good next tokens. No hidden characters.
- Seed is a hash of the last H tokens plus a secret key. Detection averages keyed g-values.
- Light edit survives. Heavy rewrite / translation by another model can destroy it.
- Code is sparsely marked. Signal lives in comments, some names, docstring wording.
- C2PA is signed file metadata, not the text watermark.
- `Co-Authored-By: Claude` is a client git trailer, disableable, still written by default.
- EU Article 50 requires a machine-readable origin signal. It does not require a secret global Claude key, a git trailer, or marking exempt proofreading.
