# ODIN pointer

Live operating OS is **not** invented here. Same org as Grok.

Chairman Desktop `XORA-BizDev`:

- `リサーチ/XORA_ODIN運営OS_20260919.md`
- `リサーチ/ODIN部署運用ルール_20260919.md`
- `リサーチ/ODIN本線引継ぎ_ZEUS監視_20260919.md`
- `CURSOR作業指示_ODIN組織引継ぎ_20260919.md`
- `営業/判断待ち/ODIN指示_20260919.md`
- `営業/判断待ち/ODIN指示_部署運用_20260919.md`
- `営業/判断待ち/ODIN指示_本線接管_20260919.md`
- KPI正本: `経理/KPI実測_*.md`（不在は FAIL。新ファイルを作るな）

ECC Agentic OS mirror in this repo (Claude Code layout, Cursor reads the same files):

- `CLAUDE.md` — kernel / roster
- `AGENTS.md` — Cursor entry
- `agents/` — 装備 + 参謀
- `.claude/commands/` — `/audit` `/situation` `/hello-cta` `/proof` `/staff` `/mainline`

Role split: ZEUS = Brain/monitor. ODIN = same ZEUS mainline 1–4 + PRs. ADAM = Claude Code. YHWH = Codex.

四柱バス（ZEUS Desktop実体と同じ）: `scripts/odin-bus.ps1` / `scripts/odin-bus-recv.cmd` / `scripts/odin-bus/PROTOCOL.md` / inbox `営業/判断待ち/odin-bus/`。入口 `.\scripts\odin-bus.ps1 recv`。Cloud は `python3 scripts/odin-bus.py`。
