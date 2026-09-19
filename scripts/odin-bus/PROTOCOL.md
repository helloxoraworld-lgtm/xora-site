# 四柱バス（Desktop実体と同じ）

ZEUSがDesktopに置いた配置:

- `scripts\odin-bus.ps1`
- `scripts\odin-bus-recv.cmd`
- `scripts\odin-bus\PROTOCOL.md`
- inbox: `営業\判断待ち\odin-bus\`
- 残証（Desktop正本）: `営業\判断待ち\odin-bus設置残証_ZEUS_20260919.md`

入口:

```powershell
cd $env:USERPROFILE\Desktop\XORA-BizDev
.\scripts\odin-bus.ps1 recv
```

ZEUSはPSを走らせない。`ODIN指示_*.md` を `営業\判断待ち` へ。
Grok API なし。本文はパスとURL。公開ログイン PARK。
