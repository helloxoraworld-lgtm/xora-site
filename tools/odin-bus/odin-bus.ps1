#Requires -Version 5.1
<#
  odin-bus — ADAM / YHWH / local ODIN share Desktop XORA-BizDev.
  ZEUS does not run this. ZEUS writes 営業\判断待ち\ODIN指示_*.md
  Not a Grok API. No dual-dispatch.
#>
[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [ValidateSet("recv", "send", "install", "help")]
  [string]$Cmd = "help",
  [string]$From,
  [string]$To,
  [ValidateSet("指示", "残証", "監視")]
  [string]$Type,
  [string]$Body
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$Pillars = @("ZEUS", "ADAM", "YHWH", "ODIN")

function Get-BizDev {
  if ($env:XORA_BIZDEV) { return $env:XORA_BIZDEV }
  return (Join-Path $env:USERPROFILE "Desktop\XORA-BizDev")
}

function Get-WaitDir {
  return (Join-Path (Get-BizDev) "営業\判断待ち")
}

function Get-Stamp {
  return [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssZ")
}

function Show-Help {
  @"
odin-bus  四柱ファイルバス (PowerShell)
正本フォルダ: $(Get-WaitDir)

  .\odin-bus.ps1 recv
  .\odin-bus.ps1 send -From ADAM -To ODIN -Type 指示 -Body "https://..."
  .\odin-bus.ps1 install

From/To: ZEUS ADAM YHWH ODIN ALL
Type: 指示 残証 監視
ZEUSはこれを実行しない。ODIN指示_*.md を判断待ちへ置く。
Grok API なし。本文はパスとURLだけ。公開ログインは撃たない。
"@
}

function Install-Bus {
  $destRoot = Get-BizDev
  $destScripts = Join-Path $destRoot "scripts"
  $wait = Get-WaitDir
  New-Item -ItemType Directory -Force -Path $destScripts, $wait | Out-Null
  $here = $PSScriptRoot
  Copy-Item -Force (Join-Path $here "odin-bus.ps1") (Join-Path $destScripts "odin-bus.ps1")
  Copy-Item -Force (Join-Path $here "odin-bus.cmd") (Join-Path $destScripts "odin-bus.cmd")
  Copy-Item -Force (Join-Path $here "odin-bus-recv.cmd") (Join-Path $destRoot "odin-bus-recv.cmd")
  Write-Output "PASS $destRoot"
  Write-Output (Join-Path $destScripts "odin-bus.ps1")
  Write-Output $wait
}

function Send-Bus {
  if ($Pillars -notcontains $From) { throw "FAIL -From ZEUS|ADAM|YHWH|ODIN" }
  if ($To -ne "ALL" -and $Pillars -notcontains $To) { throw "FAIL -To ZEUS|ADAM|YHWH|ODIN|ALL" }
  if (-not $Type) { throw "FAIL -Type 指示|残証|監視" }
  if ([string]::IsNullOrWhiteSpace($Body)) { throw "FAIL empty -Body" }

  $wait = Get-WaitDir
  New-Item -ItemType Directory -Force -Path $wait | Out-Null
  $name = "$(Get-Stamp)__${From}__${To}__${Type}.md"
  $path = Join-Path $wait $name
  $text = "from: $From`nto: $To`ntype: $Type`n`n$($Body.Trim())`n"
  [System.IO.File]::WriteAllText($path, $text, [System.Text.UTF8Encoding]::new($false))
  Write-Output $path
}

function Recv-Bus {
  $wait = Get-WaitDir
  Write-Output "odin-bus recv"
  Write-Output "wait $wait"
  Write-Output "Grok API: none"
  if (-not (Test-Path -LiteralPath $wait)) {
    Write-Output "FAIL missing $wait"
    exit 2
  }
  $hits = @(
    Get-ChildItem -LiteralPath $wait -File -Filter "*.md" -ErrorAction SilentlyContinue
  ) | Where-Object { $_.Name -notmatch '^(README|PROTOCOL)' } |
    Sort-Object LastWriteTime -Descending

  Write-Output "recv $($hits.Count)"
  if ($hits.Count -eq 0) {
    Write-Output "FAIL no messages in 判断待ち"
    exit 2
  }
  foreach ($f in $hits | Select-Object -First 20) {
    Write-Output "---"
    Write-Output $f.FullName
    Get-Content -LiteralPath $f.FullName -Encoding UTF8 -TotalCount 12
  }
}

switch ($Cmd) {
  "help" { Show-Help; break }
  "install" { Install-Bus; break }
  "send" { Send-Bus; break }
  "recv" { Recv-Bus; break }
}
