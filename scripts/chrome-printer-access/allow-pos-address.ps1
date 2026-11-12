<#
  Lets the Bitezo POS reach the Printer Agent (PrinterAgent.exe) on this till in Google Chrome.

  Chrome's Local Network Access rule blocks a web page from talking to programs on the PC unless the site is
  allowed. This adds POS server addresses to the Chrome policies for this computer (all Windows users), so
  Chrome never blocks or asks for them. Newer Chrome splits the rule in two, so all three names are set:
    LoopbackNetworkAllowedForUrls     reach programs on this PC (the Printer Agent on localhost)
    LocalNetworkAllowedForUrls        reach devices on the local network
    LocalNetworkAccessAllowedForUrls  the older combined name

  Run in PowerShell AS ADMINISTRATOR:
      .\allow-pos-address.ps1 192.168.1.53 103.209.220.154     # add one or more addresses (any port)
      .\allow-pos-address.ps1 -List                             # show what is allowed now
      .\allow-pos-address.ps1 -Remove 103.209.220.154           # take an address off again

  An address without "http://" and port covers every port on that server. Then restart Chrome and check
  chrome://policy (click Reload policies): the policies should be listed with Status OK.
#>
param(
  [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
  [string[]]$Address = @(),
  [switch]$List,
  [string]$Remove
)

$ErrorActionPreference = 'Stop'
$root = 'HKLM:\SOFTWARE\Policies\Google\Chrome'
$policies = @('LoopbackNetworkAllowedForUrls', 'LocalNetworkAllowedForUrls', 'LocalNetworkAccessAllowedForUrls')

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

function Get-Allowed([string]$policy) {
  $k = Join-Path $root $policy
  if (-not (Test-Path $k)) { return @() }
  (Get-ItemProperty -Path $k).PSObject.Properties |
    Where-Object { $_.Name -match '^\d+$' } |
    Sort-Object { [int]$_.Name } |
    ForEach-Object { [pscustomobject]@{ Number = [int]$_.Name; Address = [string]$_.Value } }
}

function Show-Allowed {
  foreach ($p in $policies) {
    $now = @(Get-Allowed $p)
    $list = if ($now.Count -eq 0) { '(none)' } else { ($now.Address -join ', ') }
    Write-Host ("{0,-34} {1}" -f $p, $list)
  }
}

# Accept "http://192.168.1.53:8090/" too: keep only the server address so every port is covered.
function Normalize([string]$a) {
  $a = $a.Trim()
  $a = $a -replace '^[a-zA-Z]+://', ''
  $a = $a -replace '/.*$', ''
  if ($a -match '^\[.*\]') { return $a }          # IPv6 in brackets
  return ($a -replace ':\d+$', '')
}

if ($List -or (($Address.Count -eq 0) -and -not $Remove)) { Show-Allowed; exit 0 }

if (-not $isAdmin) {
  Write-Host 'Please run PowerShell as Administrator (right-click PowerShell > Run as administrator).' -ForegroundColor Red
  exit 1
}

foreach ($p in $policies) { $k = Join-Path $root $p; if (-not (Test-Path $k)) { New-Item -Path $k -Force | Out-Null } }

if ($Remove) {
  $target = Normalize $Remove
  $found = $false
  foreach ($p in $policies) {
    foreach ($h in @(Get-Allowed $p | Where-Object { $_.Address -eq $target })) {
      Remove-ItemProperty -Path (Join-Path $root $p) -Name ([string]$h.Number)
      $found = $true
    }
  }
  if ($found) { Write-Host "Removed $target" -ForegroundColor Green } else { Write-Host "$target was not in the list." -ForegroundColor Yellow }
  Show-Allowed
  exit 0
}

foreach ($raw in $Address) {
  $a = Normalize $raw
  if (-not $a) { continue }
  foreach ($p in $policies) {
    $existing = @(Get-Allowed $p)
    if ($existing.Address -contains $a) { continue }
    $next = if ($existing.Count -eq 0) { 1 } else { ($existing | Measure-Object -Property Number -Maximum).Maximum + 1 }
    New-ItemProperty -Path (Join-Path $root $p) -Name ([string]$next) -Value $a -PropertyType String -Force | Out-Null
  }
  Write-Host "Allowed $a" -ForegroundColor Green
}

Show-Allowed
Write-Host 'Now close ALL Chrome windows, open Chrome again and check chrome://policy (click Reload policies).' -ForegroundColor Cyan
