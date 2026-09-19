#!/usr/bin/env python3
"""ODIN ingest — read ZEUS file-指示. Not a Grok bridge.

ZEUS can: Cloud Agent follow-up / write 営業/判断待ち/ODIN指示_*.md
ZEUS cannot: type into local Cursor chat.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOTS = [
    Path("/workspace/inbox/zeus"),
    Path("/workspace/営業/判断待ち"),
    Path("/home/ubuntu/.cursor/projects/workspace/uploads"),
    Path.home() / "Desktop" / "XORA-BizDev" / "営業" / "判断待ち",
    Path.home() / "Desktop" / "XORA-BizDev" / "リサーチ",
]

GLOBS = (
    "ODIN指示*.md",
    "ODIN部署運用ルール*.md",
    "ODIN本線引継ぎ*.md",
    "XORA_ODIN運営OS*.md",
    "ODIN_ORG_HANDOVER*.md",
    "ODIN_NOW*.md",
)

CANON = [
    "リサーチ/ODIN本線引継ぎ_ZEUS監視_20260919.md",
    "営業/判断待ち/ODIN指示_本線接管_20260919.md",
    "リサーチ/ODIN部署運用ルール_20260919.md",
    "リサーチ/XORA_ODIN運営OS_20260919.md",
]


def iter_roots() -> list[Path]:
    found = []
    for raw in ROOTS:
        if "*" in str(raw):
            parent = raw.parent
            if parent.exists():
                found.extend(sorted(parent.glob(raw.name)))
            continue
        if raw.exists():
            found.append(raw)
    return found


def collect() -> list[Path]:
    hits: list[Path] = []
    seen = set()
    for root in iter_roots():
        if root.is_file():
            cand = [root]
        else:
            cand = []
            for g in GLOBS:
                cand.extend(root.glob(g))
                cand.extend(root.glob("**/" + g))
        for p in cand:
            key = str(p.resolve())
            if key in seen:
                continue
            seen.add(key)
            hits.append(p)
    return sorted(hits, key=lambda p: p.stat().st_mtime, reverse=True)


def main() -> int:
    hits = collect()
    print("ODIN ingest")
    print("ZEUS→ODIN: Cloud Agent reply / ODIN指示_*.md")
    print("ZEUS↛ local Cursor chat")
    print("canon (Desktop XORA-BizDev):")
    for c in CANON:
        print(" -", c)
    print("hits", len(hits))
    if not hits:
        print("FAIL no 指示 files on this VM")
        return 2
    for p in hits:
        print("---")
        print(p)
        try:
            text = p.read_text(encoding="utf-8", errors="replace")
        except OSError as e:
            print("FAIL", e)
            continue
        lines = [ln for ln in text.splitlines() if ln.strip()][:8]
        for ln in lines:
            print(ln)
    return 0


if __name__ == "__main__":
    sys.exit(main())
