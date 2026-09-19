# 四柱バス (Windows). ADAM / YHWH / local ODIN share Desktop XORA-BizDev.
# ZEUS does not run this. ZEUS writes 営業\判断待ち\ODIN指示_*.md
# Not a Grok API. No dual-dispatch.

param(
  [Parameter(Position = 0)]
  [ValidateSet("recv", "send")]
  [string]$Cmd = "recv",
  [string]$From,
  [string]$To,
  [string]$Type,
  [string]$Body
)

$ErrorActionPreference = "Stop"
$Pillars = @("ZEUS", "ADAM", "YHWH", "ODIN")
$Types = @("指示", "残証", "監視")

$BizDev = $env:XORA_BIZDEV
if (-not $BizDev) {
  $BizDev = Join-Path $env:USERPROFILE "Desktop\XORA-BizDev"
}
$Wait = Join-Path $BizDev "営業\判断待ち"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$RepoBus = Join-Path $RepoRoot "inbox\bus\messages"

function Get-Stamp {
  [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssZ")
}

function Send-Bus {
  if ($Pillars -notcontains $From) { throw "FAIL --From ZEUS|ADAM|YHWH|ODIN" }
  if ($To -ne "ALL" -and $Pillars -notcontains $To) { throw "FAIL --To ZEUS|ADAM|YHWH|ODIN|ALL" }
  if ($Types -notcontains $Type) { throw "FAIL --Type 指示|残証|監視" }
  if ([string]::IsNullOrWhiteSpace($Body)) { throw "FAIL empty --Body" }

  $name = "$(Get-Stamp)__${From}__${To}__${Type}.md"
  $text = "from: $From`nto: $To`ntype: $Type`n`n$($Body.Trim())`n"
  $written = @()

  foreach ($dir in @($RepoBus, $Wait)) {
    if (-not $dir) { continue }
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $path = Join-Path $dir $name
    [System.IO.File]::WriteAllText($path, $text, [System.Text.UTF8Encoding]::new($false))
    $written += $path
  }
  $written
}

function Recv-Bus {
  $roots = @($RepoBus, $Wait)
  $hits = @()
  foreach ($root in $roots) {
    if (-not (Test-Path $root)) { continue }
    $hits += Get-ChildItem -Path $root -File -Filter *.md -ErrorAction SilentlyContinue
    $hits += Get-ChildItem -Path $root -File -Filter "ODIN指示*.md" -ErrorAction SilentlyContinue
    $hits += Get-ChildItem -Path $root -File -Filter "ODIN残証*.md" -ErrorAction SilentlyContinue
  }
  $hits |
    Where-Object { $_.Name -notin @("README.md", "PROTOCOL.md") } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Unique -Property FullName, LastWriteTime, Name
}

Write-Output "odin-bus.ps1"
Write-Output "BizDev $BizDev"
Write-Output "Grok API: none. ZEUS writes ODIN指示_*.md to 判断待ち."

if ($Cmd -eq "send") {
  Send-Bus
  exit 0
}

$rows = @(Recv-Bus)
Write-Output "recv $($rows.Count)"
if ($rows.Count -eq 0) {
  Write-Output "FAIL no bus messages"
  exit 2
}
foreach ($r in $rows | Select-Object -First 20) {
  $p = $r.FullName
  Write-Output "---"
  Write-Output $p
  Get-Content -LiteralPath $p -Encoding UTF8 -TotalCount 10
}
exit 0
