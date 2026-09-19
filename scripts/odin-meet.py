#!/usr/bin/env python3
"""3-person room (ADAM/YHWH/ODIN) then ODIN reports to ZEUS via bus.

ZEUS does not sit in the room.
"""
from __future__ import annotations

import argparse
import datetime as dt
import sys
from pathlib import Path

BOARD = Path("/workspace/営業/判断待ち/四柱会議.md")
BUS = Path("/workspace/scripts/odin-bus.py")


def stamp() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def start(topic: str, source: str) -> None:
    BOARD.parent.mkdir(parents=True, exist_ok=True)
    block = (
        f"\n### 議題: {topic.strip()}\n"
        f"- 起点: {source}\n"
        f"- 時刻: {stamp()}\n"
        f"- ADAM:\n"
        f"- YHWH:\n"
        f"- ODIN:\n"
        f"- 報告（ODIN→ZEUS）:\n"
    )
    if not BOARD.exists():
        BOARD.write_text("# 四柱会議（3人部屋）\n", encoding="utf-8")
    with BOARD.open("a", encoding="utf-8") as f:
        f.write(block)
    print(BOARD)


def report(body: str) -> None:
    import subprocess

    subprocess.check_call(
        [
            sys.executable,
            str(BUS),
            "send",
            "--from",
            "ODIN",
            "--to",
            "ZEUS",
            "--type",
            "残証",
            "--body",
            body.strip(),
        ]
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("start")
    s.add_argument("--topic", required=True)
    s.add_argument("--source", default="3人発", choices=("3人発", "ZEUS指示"))
    r = sub.add_parser("report")
    r.add_argument("--body", required=True)
    args = ap.parse_args()
    if args.cmd == "start":
        start(args.topic, args.source)
        return 0
    report(args.body)
    return 0


if __name__ == "__main__":
    sys.exit(main())
