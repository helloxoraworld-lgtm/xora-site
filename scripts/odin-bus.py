#!/usr/bin/env python3
"""Four-pillar file bus: ADAM / YHWH / ZEUS / ODIN.

Not a Grok or Slack API. Shared markdown in inbox/bus/messages
plus Desktop 営業/判断待ち.
"""
from __future__ import annotations

import argparse
import datetime as dt
import sys
from pathlib import Path

PILLARS = ("ZEUS", "ADAM", "YHWH", "ODIN")
TYPES = ("指示", "残証", "監視")
BUS_DIR = Path("/workspace/inbox/bus/messages")
DESKTOP_WAIT = Path.home() / "Desktop" / "XORA-BizDev" / "営業" / "判断待ち"
UPLOADS = Path("/home/ubuntu/.cursor/projects/workspace/uploads")
REPO_WAIT = Path("/workspace/営業/判断待ち")
ZEUS_INBOX = Path("/workspace/inbox/zeus")


def utc_stamp() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def extra_roots() -> list[Path]:
    return [p for p in (DESKTOP_WAIT, REPO_WAIT, ZEUS_INBOX, UPLOADS) if p.exists()]


def send(src: str, dest: str, typ: str, body: str) -> Path:
    if src not in PILLARS or dest not in PILLARS + ("ALL",):
        raise SystemExit("FAIL from/to must be ZEUS|ADAM|YHWH|ODIN|ALL")
    if typ not in TYPES:
        raise SystemExit("FAIL type must be 指示|残証|監視")
    text = body.strip()
    if not text:
        raise SystemExit("FAIL empty body")
    BUS_DIR.mkdir(parents=True, exist_ok=True)
    name = f"{utc_stamp()}__{src}__{dest}__{typ}.md"
    path = BUS_DIR / name
    path.write_text(
        f"from: {src}\nto: {dest}\ntype: {typ}\n\n{text}\n",
        encoding="utf-8",
    )
    if dest in ("ZEUS", "ALL") and DESKTOP_WAIT.exists():
        mirror = DESKTOP_WAIT / f"ODIN残証_{utc_stamp()}.md"
        mirror.write_text(path.read_text(encoding="utf-8"), encoding="utf-8")
        print(mirror)
    print(path)
    return path


def recv() -> list[Path]:
    hits: list[Path] = []
    seen = set()
    roots = [BUS_DIR, *extra_roots()]
    globs = ("*.md", "ODIN指示*.md", "ODIN残証*.md")
    for root in roots:
        if not root.exists():
            continue
        for g in globs:
            for p in root.glob(g):
                if p.name == "README.md" or p.name == "PROTOCOL.md":
                    continue
                key = str(p.resolve())
                if key in seen:
                    continue
                seen.add(key)
                hits.append(p)
    hits.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return hits


def main() -> int:
    ap = argparse.ArgumentParser(description="ADAM/YHWH/ZEUS/ODIN file bus")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("recv")
    s = sub.add_parser("send")
    s.add_argument("--from", dest="src", required=True, choices=PILLARS)
    s.add_argument("--to", dest="dest", required=True, choices=PILLARS + ("ALL",))
    s.add_argument("--type", dest="typ", required=True, choices=TYPES)
    s.add_argument("--body", required=True)
    args = ap.parse_args()
    if args.cmd == "send":
        send(args.src, args.dest, args.typ, args.body)
        return 0
    hits = recv()
    print("bus recv", len(hits))
    print("Grok API: none. ZEUS uses files or Cloud Agent follow-up.")
    if not hits:
        print("FAIL no bus messages")
        return 2
    for p in hits[:20]:
        print("---")
        print(p)
        lines = [ln for ln in p.read_text(encoding="utf-8", errors="replace").splitlines() if ln.strip()][:10]
        for ln in lines:
            print(ln)
    return 0


if __name__ == "__main__":
    sys.exit(main())
