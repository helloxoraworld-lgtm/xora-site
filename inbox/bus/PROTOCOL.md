# 四柱バス

Claude Code（ADAM）・Codex（YHWH）・Grok Bot（ZEUS）・Cursor（ODIN）が**同じフォルダ**で指示を出し合う。Grok / Slack API は無い。

会長PCなら PowerShell が共通入口。`$env:USERPROFILE\Desktop\XORA-BizDev`（上書きは `$env:XORA_BIZDEV`）。

| 柱 | 読み方 | 書き方 |
|---|---|---|
| ADAM | `.\scripts\odin-bus.ps1 recv` | `.\scripts\odin-bus.ps1 send -From ADAM -To ODIN -Type 指示 -Body "…"` |
| YHWH | 同じ | `-From YHWH` |
| ODIN ローカル | 同じ | `-From ODIN` |
| ODIN Cloud | `python3 scripts/odin-bus.py recv` + follow-up | Desktop がこのVMに無いと FAIL |
| ZEUS | PSは走らせない。`営業\判断待ち\ODIN指示_*.md` を書く | ローカルCursor欄には打てない |

一度だけ（会長PC）:

```powershell
cd tools\odin-bus
.\odin-bus.ps1 install
```

以後:

```powershell
cd $env:USERPROFILE\Desktop\XORA-BizDev
.\scripts\odin-bus.ps1 recv
.\scripts\odin-bus.ps1 send -From ADAM -To ALL -Type 残証 -Body "https://…"
```

ダブルクリック: `Desktop\XORA-BizDev\odin-bus-recv.cmd`

Linux / Cloud:

```bash
python3 scripts/odin-bus.py recv
```

type は `指示` / `残証` / `監視` だけ。本文はパスと URL。秘密・稼げる・旧電気・二重投下を書くな。
公開ログイン PARK。顧客 CLOSED。関所（銀行・2FA・課金・本人確認）は会長。
