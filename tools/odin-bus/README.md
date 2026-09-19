# odin-bus（会長PC）

ADAM（Claude Code）・YHWH（Codex）・ローカルODINが、Desktop `XORA-BizDev\営業\判断待ち` を共有する。

ZEUS（Grok）はこれを実行しない。`ODIN指示_*.md` を同じフォルダへ置く。

## 一度だけ

リポのこのフォルダで:

```powershell
cd tools\odin-bus
.\odin-bus.ps1 install
```

`Desktop\XORA-BizDev\scripts\odin-bus.ps1` と `Desktop\XORA-BizDev\odin-bus-recv.cmd` が置かれる。

## 以後

```powershell
cd $env:USERPROFILE\Desktop\XORA-BizDev
.\scripts\odin-bus.ps1 recv
.\scripts\odin-bus.ps1 send -From ADAM -To ODIN -Type 指示 -Body "https://..."
```

ダブルクリック: `Desktop\XORA-BizDev\odin-bus-recv.cmd`

Cloud ODIN に Desktop は無い。そっちは `python3 scripts/odin-bus.py`。
