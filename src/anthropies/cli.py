"""anthropies inspect|clean|humanize"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import __version__
from .clean import clean_text, inspect_text
from .humanize import rewrite

CODE_SUFFIX = {
    ".py",
    ".js",
    ".ts",
    ".tsx",
    ".jsx",
    ".go",
    ".rs",
    ".java",
    ".cs",
    ".c",
    ".h",
    ".cpp",
    ".rb",
    ".php",
    ".sh",
    ".sql",
}


def _read(path: str) -> tuple[str, str]:
    if path == "-":
        return sys.stdin.read(), "stdin"
    p = Path(path)
    return p.read_text(encoding="utf-8"), p.name


def _write(path: str, text: str, in_place: bool, dest: str | None) -> None:
    if dest:
        Path(dest).write_text(text, encoding="utf-8", newline="\n")
        return
    if path == "-":
        sys.stdout.write(text)
        return
    out = Path(path) if in_place else Path(path).with_suffix(Path(path).suffix + ".cleaned")
    if path != "-" and not in_place and Path(path).suffix:
        out = Path(str(Path(path)) + ".cleaned")
    out.write_text(text, encoding="utf-8", newline="\n")


def cmd_inspect(args: argparse.Namespace) -> int:
    text, name = _read(args.path)
    report = inspect_text(text, name=name)
    if args.json:
        print(json.dumps({"suspicious": report.suspicious, "removed": report.removed, "findings": report.findings}))
    else:
        for line in report.findings or ["no deterministic marks found"]:
            print(line)
    return 1 if report.suspicious else 0


def cmd_clean(args: argparse.Namespace) -> int:
    text, name = _read(args.path)
    out, report = clean_text(text, name=name)
    _write(args.path, out, args.in_place, args.output)
    if args.json:
        print(json.dumps({"removed": report.removed, "findings": report.findings}), file=sys.stderr)
    else:
        for line in report.findings:
            print(line, file=sys.stderr)
    return 0


def cmd_humanize(args: argparse.Namespace) -> int:
    text, name = _read(args.path)
    cleaned, report = clean_text(text, name=name)
    suffix = Path(name).suffix.lower()
    kind = "code" if suffix in CODE_SUFFIX else "prose"
    if args.kind:
        kind = args.kind
    rewritten, note = rewrite(cleaned, kind=kind)
    _write(args.path, rewritten, args.in_place, args.output)
    print(note, file=sys.stderr)
    for line in report.findings:
        print(line, file=sys.stderr)
    return 0


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="anthropies")
    p.add_argument("--version", action="version", version=__version__)
    sub = p.add_subparsers(dest="cmd", required=True)

    for name, fn in (("inspect", cmd_inspect), ("clean", cmd_clean), ("humanize", cmd_humanize)):
        sp = sub.add_parser(name)
        sp.add_argument("path")
        sp.add_argument("-o", "--output", default=None)
        sp.add_argument("--in-place", action="store_true")
        sp.add_argument("--json", action="store_true")
        if name == "humanize":
            sp.add_argument("--kind", choices=("prose", "code"), default=None)
        sp.set_defaults(func=fn)

    args = p.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
