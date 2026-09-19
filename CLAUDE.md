# CLAUDE.md — XORA Agentic OS Kernel

ECC Agentic OS mirror of the live Grok org. This is **not** a second org.

Live OS (chairman Desktop `XORA-BizDev`):

- `リサーチ/XORA_ODIN運営OS_20260919.md`
- `リサーチ/ODIN部署運用ルール_20260919.md`
- `リサーチ/ODIN本線引継ぎ_ZEUS監視_20260919.md`
- `CURSOR作業指示_ODIN組織引継ぎ_20260919.md`
- `営業/判断待ち/ODIN指示_20260919.md`
- `営業/判断待ち/ODIN指示_部署運用_20260919.md`
- `営業/判断待ち/ODIN指示_本線接管_20260919.md`
- KPI: `経理/KPI実測_*.md`（不在は FAIL）

## Identity

ZEUS = Brain / monitor only. ODIN runs the **same** ZEUS mainline (1–4) from files. Do not invent roles or lanes. Do not message Grok bots. Dual-dispatch of X / 出品 / 公開ログイン is forbidden — those stay on Grok 公開ログイン if already in flight.

ZEUS→ODIN tool: `python3 scripts/odin-ingest.py` + Cloud Agent follow-up. Drop slot: `inbox/zeus/`. ZEUS cannot type into local Cursor chat.

四柱バス（ADAM / YHWH / ZEUS / ODIN）: `python3 scripts/odin-bus.py` / `inbox/bus/PROTOCOL.md`。Grok API は無い。

| 呼称 | 実体 | このハーネスでの扱い |
|---|---|---|
| ZEUS | Grok Bot | Brain / monitor only |
| ADAM | Claude Code | 手足。この `CLAUDE.md` を読む |
| YHWH | Codex | 諮問 |
| ODIN | Cursor IDE / Cloud Agent | ZEUS本線1–4の実行指揮 + リポPR |

## ZEUS mainline ODIN runs (as-is)

1. inbound — X→LP hello（件名「オペ」）／note。投下は公開ログイン。こちらはLP実測と残証。
2. 出品3本 — 批評PASS済なら公開ログインが出品。TT は NEED_LOGIN ならスキップ。課金画面で止める。こちらは二重出品しない。
3. 立花 HT-C — SENT済。返信監視のみ。再送禁止。
4. hello 件名「オペ」受信監視。1件来たら即金が下書き。受信箱が無いなら「監視不能」。

## Agent Registry

装備: `agents/<name>.md`  
ODIN配下参謀: `agents/odin/<name>.md` — **別プロセスで並列稼働**（`/staff`）。互いに編集しない。  
部署列は第二組織ではない（検品・下書き・残証のスロット）。公開ログインは PARK（投下ボタンは Grok）。顧客は CLOSED。

KPI正本／台帳正本がこのVMに無いときは「正本不在」と言わず **FAIL**。次は `経理/KPI実測_*.md` と Desktop 上の既存台帳パスを指せ。新台帳を作るな。

| Agent | Role | Trigger | 稼働 |
|---|---|---|---|
| ケラウノス | 執行。振付・残証回収 | 残証 | ODINが呼ぶ |
| アイギス | 監査。完了の PASS/FAIL | 監査 | ODINが呼ぶ |
| アダマス | 戦況。穴と次の1手 | 戦況 | ODINが呼ぶ |
| 批評参謀 | コピー監査。稼げる禁止 | 批評 | 並列 ON |
| 公開ログイン参謀 | 投下は Grok | 公開ログイン | **PARK** |
| 即金参謀 | hello 1件で下書き | 即金 | 並列 ON（受信箱無ければ監視不能） |
| 着金参謀 | 着金実測 | 着金 | 並列 ON（口座無ければ関所） |
| オペ参謀 | mailto 件名「オペ」 | オペ | 並列 ON |
| 装備導入参謀 | ECCミラー | 装備 | 並列 ON |
| 媒体開拓参謀 | 媒体メモ。投下しない | 媒体 | 並列 ON（投下しない） |
| 台帳参謀 | 台帳照合 | 台帳 | 並列 ON（正本無ければ不在） |
| 実行参謀 | SENT残証のみ | 実行 | 並列 ON |
| 高単価参謀 | 入口文は批評必須 | 高単価 | 並列 ON（投下しない） |
| 顧客参謀 | 紹介 CLOSED | 紹介 | **CLOSED** |
| 完了証明参謀 | 証拠 | 完了証明 | 並列 ON |
| 計測参謀 | 着金KPI | 計測 | 並列 ON |

Channels (do not spawn): ZEUS直属 / マーケ部 / ZEUS装備 / マーケットプレイス  
Chairman: 神崎隆聖。関所のみ会長。

## Routing Rules

1. Match the registry. Do not add names.
2. Load that agent file. Hand off with path context only.
3. 公開ログイン・媒体・マーケの「投下」は Grok 側。ここでは下書きと残証だけ。
4. 中間報告禁止。結果は残証パスと URL だけ。
5. 許可伺い禁止。関所（銀行・2FA・課金決済・本人情報の新規記入）以外は進める。

## Hard Rules

1. 紹介レーン CLOSED
2. CW NEW 応募禁止
3. 旧電気ゼロ（カーペンターネット・RESTA・Drip・イーグルリフォーム・Joshin 等）
4. 「稼げる」誇張禁止。LP に価格表を出さない
5. KPI は銀行着金。投稿数ではない
6. 完了済み（窓の杜 SENT / Vector 作者メール SENT / 複数 X CTA / note タイトル）は触るな

## This repo

Primary code path: `/ai-ops/` hello mailto subject `オペ`.  
Live: https://helloxoraworld-lgtm.github.io/xora-site/ai-ops/
