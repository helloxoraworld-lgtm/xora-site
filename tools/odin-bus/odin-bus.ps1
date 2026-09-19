#Requires -Version 5.1
<#
  Same layout as Desktop XORA-BizDev (ZEUS 2026-09-19):
    scripts\odin-bus.ps1
    scripts\odin-bus-recv.cmd
    scripts\odin-bus\PROTOCOL.md
    inbox: 営業\判断待ち\odin-bus\
  ZEUS does not run this. ZEUS writes ODIN指示_*.md
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

function Get-WaitDir { return (Join-Path (Get-BizDev) "営業\判断待ち") }
function Get-InboxDir { return (Join-Path (Get-WaitDir) "odin-bus") }

function Get-Stamp { return [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssZ") }

function Show-Help {
  @"
odin-bus
入口:
  cd `$env:USERPROFILE\Desktop\XORA-BizDev
  .\scripts\odin-bus.ps1 recv

inbox: $(Get-InboxDir)
ZEUSはPSを走らせない。ODIN指示_*.md を 判断待ち へ。
"@
}

function Install-Bus {
  $destRoot = Get-BizDev
  $destScripts = Join-Path $destRoot "scripts"
  $destProto = Join-Path $destScripts "odin-bus"
  $inbox = Get-InboxDir
  New-Item -ItemType Directory -Force -Path $destScripts, $destProto, $inbox | Out-Null
  $src = if (Test-Path (Join-Path $PSScriptRoot "odin-bus.ps1")) { $PSScriptRoot } else { $PSScriptRoot }
  Copy-Item -Force (Join-Path $src "odin-bus.ps1") (Join-Path $destScripts "odin-bus.ps1")
  $recv = Join-Path $src "odin-bus-recv.cmd"
  if (Test-Path $recv) { Copy-Item -Force $recv (Join-Path $destScripts "odin-bus-recv.cmd") }
  $proto = Join-Path $src "odin-bus\PROTOCOL.md"
  if (Test-Path $proto) { Copy-Item -Force $proto (Join-Path $destProto "PROTOCOL.md") }
  Write-Output "PASS $destRoot"
  Write-Output (Join-Path $destScripts "odin-bus.ps1")
  Write-Output $inbox
}

function Send-Bus {
  if ($Pillars -notcontains $From) { throw "FAIL -From" }
  if ($To -ne "ALL" -and $Pillars -notcontains $To) { throw "FAIL -To" }
  if (-not $Type) { throw "FAIL -Type" }
  if ([string]::IsNullOrWhiteSpace($Body)) { throw "FAIL empty -Body" }
  $inbox = Get-InboxDir
  New-Item -ItemType Directory -Force -Path $inbox | Out-Null
  $path = Join-Path $inbox "$(Get-Stamp)__${From}__${To}__${Type}.md"
  $text = "from: $From`nto: $To`ntype: $Type`n`n$($Body.Trim())`n"
  [System.IO.File]::WriteAllText($path, $text, [System.Text.UTF8Encoding]::new($false))
  Write-Output $path
}

function Recv-Bus {
  $wait = Get-WaitDir
  $inbox = Get-InboxDir
  Write-Output "odin-bus recv"
  Write-Output "inbox $inbox"
  if (-not (Test-Path -LiteralPath $wait)) {
    Write-Output "FAIL missing $wait"
    exit 2
  }
  $hits = @()
  foreach ($dir in @($inbox, $wait)) {
    if (-not (Test-Path -LiteralPath $dir)) { continue }
    $hits += Get-ChildItem -LiteralPath $dir -File -Filter "*.md" -ErrorAction SilentlyContinue
  }
  $hits = $hits |
    Where-Object { $_.Name -notmatch '^(README|PROTOCOL)' } |
    Sort-Object LastWriteTime -Descending
  Write-Output "recv $($hits.Count)"
  if ($hits.Count -eq 0) {
    Write-Output "FAIL no messages"
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
