"""Layer B: break SynthID-class H-grams. Never call Claude or Gemini."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

ORIGIN_BLOCKLIST = (
    "claude",
    "anthropic",
    "gemini",
    "google-gemini",
    "synthid",
)

PROSE_PROMPT = """Rewrite the text below so almost no original 5-word sequence survives.

Rules:
- Keep every fact, number, name, URL, citation, and code fence byte-stable.
- Change clause order, sentence boundaries, discourse markers, and function words.
- Do not synonym-swap in place while keeping the same sentence skeleton.
- Output only the rewritten text.

TEXT:
"""

CODE_PROMPT = """Rewrite only comments, docstrings, and non-load-bearing string literals.
Do not change public APIs, protocol strings, test snapshots, imports, or behavior.
Keep the code compiling. Output only the rewritten file.

FILE:
"""


def backend_is_blocked(name: str) -> bool:
    n = (name or "").lower()
    return any(b in n for b in ORIGIN_BLOCKLIST)


def build_prompt(text: str, kind: str) -> str:
    prefix = CODE_PROMPT if kind == "code" else PROSE_PROMPT
    return prefix + text


def rewrite(text: str, kind: str = "prose") -> tuple[str, str]:
    """Return (output, note). Default is print-prompt (no model)."""
    backend = os.environ.get("ANTHROPIES_REWRITE_BACKEND", "print-prompt")
    model = os.environ.get("ANTHROPIES_REWRITE_MODEL", "")
    if backend_is_blocked(backend) or backend_is_blocked(model):
        return text, "refused: origin model would re-stamp the mark"
    prompt = build_prompt(text, kind)
    if backend == "print-prompt":
        return prompt, "print-prompt: run this on an unmarked local model"
    if backend == "ollama":
        return _ollama(prompt, model or "llama3.2")
    if backend == "openai-compatible":
        return _openai_compatible(prompt, model or "local")
    return text, f"unknown backend {backend}"


def _ollama(prompt: str, model: str) -> tuple[str, str]:
    url = os.environ.get("ANTHROPIES_REWRITE_BASE_URL", "http://127.0.0.1:11434")
    body = json.dumps({"model": model, "prompt": prompt, "stream": False}).encode()
    req = urllib.request.Request(
        url.rstrip("/") + "/api/generate",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode())
        return data.get("response", ""), f"ollama:{model}"
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        return prompt, f"ollama failed: {exc}; falling back to print-prompt"


def _openai_compatible(prompt: str, model: str) -> tuple[str, str]:
    url = os.environ.get("ANTHROPIES_REWRITE_BASE_URL", "http://127.0.0.1:11434/v1")
    key = os.environ.get("ANTHROPIES_REWRITE_API_KEY", "")
    if not url.startswith("http://127.0.0.1") and os.environ.get(
        "ANTHROPIES_REWRITE_ALLOW_REMOTE"
    ) != "1":
        return prompt, "remote rewrite denied (set ANTHROPIES_REWRITE_ALLOW_REMOTE=1)"
    payload = {
        "model": model,
        "temperature": 0.9,
        "messages": [{"role": "user", "content": prompt}],
    }
    headers = {"Content-Type": "application/json"}
    if key:
        headers["Authorization"] = "Bearer " + key
    req = urllib.request.Request(
        url.rstrip("/") + "/chat/completions",
        data=json.dumps(payload).encode(),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode())
        text = data["choices"][0]["message"]["content"]
        return text, f"openai-compatible:{model}"
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError) as exc:
        return prompt, f"openai-compatible failed: {exc}"
