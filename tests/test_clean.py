import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from anthropies.clean import clean_text, inspect_text


class TrailerTests(unittest.TestCase):
    def test_strips_claude_trailer(self):
        src = "Fix the bug\n\nCo-Authored-By: Claude <noreply@anthropic.com>\n"
        out, report = clean_text(src, name="COMMIT_EDITMSG")
        self.assertNotIn("noreply@anthropic.com", out)
        self.assertIn("Fix the bug", out)
        self.assertGreater(report.removed.get("git-trailer", 0), 0)

    def test_keeps_human_trailer(self):
        src = "Fix the bug\n\nCo-authored-by: Jane Doe <jane@example.com>\n"
        out, report = clean_text(src, name="COMMIT_EDITMSG")
        self.assertIn("jane@example.com", out)
        self.assertEqual(report.removed.get("git-trailer", 0), 0)

    def test_strips_generated_with_banner(self):
        src = "# helper\n# Generated with Claude Code\nprint(1)\n"
        out, _ = clean_text(src, name="app.py")
        self.assertNotIn("Generated with Claude Code", out)
        self.assertIn("print(1)", out)


class UnicodeTests(unittest.TestCase):
    def test_strips_zwsp(self):
        src = "hello\u200bworld"
        out, report = clean_text(src, name="note.txt")
        self.assertEqual(out, "helloworld")
        self.assertGreater(report.removed.get("unicode", 0), 0)

    def test_keeps_emoji_zwj_family(self):
        src = "family \U0001f468\u200d\U0001f469\u200d\U0001f467"
        out, _ = clean_text(src, name="note.txt")
        self.assertEqual(out, src)

    def test_inspect_finds_trailer(self):
        src = "x\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>\n"
        report = inspect_text(src, name="COMMIT_EDITMSG")
        self.assertTrue(report.suspicious)


if __name__ == "__main__":
    unittest.main()
