import os
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from anthropies.humanize import backend_is_blocked, rewrite


class HumanizeTests(unittest.TestCase):
    def test_blocks_claude_backend(self):
        self.assertTrue(backend_is_blocked("claude-opus"))
        self.assertTrue(backend_is_blocked("anthropic"))
        self.assertTrue(backend_is_blocked("gemini-2.5"))
        self.assertFalse(backend_is_blocked("llama3.2"))

    def test_refuses_origin_env(self):
        os.environ["ANTHROPIES_REWRITE_BACKEND"] = "claude"
        try:
            text, note = rewrite("hello", kind="prose")
        finally:
            os.environ.pop("ANTHROPIES_REWRITE_BACKEND", None)
        self.assertEqual(text, "hello")
        self.assertIn("refused", note)

    def test_print_prompt_default(self):
        os.environ.pop("ANTHROPIES_REWRITE_BACKEND", None)
        text, note = rewrite("The compiler rejected the patch.", kind="prose")
        self.assertIn("The compiler rejected the patch.", text)
        self.assertIn("print-prompt", note)
