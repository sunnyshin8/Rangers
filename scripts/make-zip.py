#!/usr/bin/env python3
"""Create leak-radar.zip from repo root, honoring .gitignore patterns."""
from __future__ import annotations

import fnmatch
import os
import sys
import zipfile
from pathlib import Path


def load_gitignore(repo_root: Path) -> tuple[list[str], list[str]]:
    """Return (exclude_patterns, negation_patterns)."""
    path = repo_root / ".gitignore"
    excludes: list[str] = []
    negations: list[str] = []
    if not path.is_file():
        return excludes, negations
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("!"):
            negations.append(line[1:].strip())
        else:
            excludes.append(line)
    return excludes, negations


def path_matches_any(rel: str, patterns: list[str]) -> bool:
    rel_posix = rel.replace(os.sep, "/")
    parts = rel_posix.split("/")
    for pat in patterns:
        p = pat.rstrip("/")
        if p.endswith("/"):
            # directory pattern: any path segment
            name = p[:-1]
            if name in parts:
                return True
            continue
        if "/" in p:
            if fnmatch.fnmatch(rel_posix, p) or fnmatch.fnmatch(rel_posix, "**/" + p):
                return True
            if fnmatch.fnmatch(rel_posix, p + "/**"):
                return True
        else:
            # basename glob
            base = Path(rel_posix).name
            if fnmatch.fnmatch(base, p):
                return True
            if fnmatch.fnmatch(rel_posix, "**/" + p):
                return True
    return False


def is_excluded(rel_posix: str, excludes: list[str], negations: list[str]) -> bool:
    if not path_matches_any(rel_posix, excludes):
        return False
    if negations and path_matches_any(rel_posix, negations):
        return False
    return True


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    out_zip = repo_root.parent / "leak-radar.zip"
    excludes, negations = load_gitignore(repo_root)

    count = 0
    with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED) as zf:
        for dirpath, dirnames, filenames in os.walk(repo_root):
            dp = Path(dirpath)
            rel_dir = dp.relative_to(repo_root).as_posix()
            if rel_dir == ".":
                rel_dir = ""

            # Prune excluded directories from walk
            keep_dirs: list[str] = []
            for d in dirnames:
                sub = f"{rel_dir}/{d}".strip("/") if rel_dir else d
                if is_excluded(sub, excludes, negations):
                    continue
                keep_dirs.append(d)
            dirnames[:] = keep_dirs

            for name in filenames:
                sub = f"{rel_dir}/{name}".strip("/") if rel_dir else name
                if is_excluded(sub, excludes, negations):
                    continue
                full = dp / name
                arc = sub
                zf.write(full, arcname=arc)
                count += 1

    print(f"Wrote {out_zip} ({count} files)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
