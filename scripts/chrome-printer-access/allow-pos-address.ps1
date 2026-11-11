<#
  Lets the Bitezo POS reach the Printer Agent (PrinterAgent.exe) on this till in Google Chrome.

  Chrome (Local Network Access, Chrome 141+) blocks a web page from talking to programs on the PC unless the
  site is allowed. This adds POS server addresses to the Chrome policy LocalNetworkAccessAllowedForUrls for this
  computer (all Windows users), so Chrome never blocks or asks for them.

  Run in PowerShell AS ADMINISTRATOR:
      .\allow-pos-address.ps1 192.168.1.53 103.209.220.154     # add one or more addresses (any port)
      .\allow-pos-address.ps1 -List                             # show what is allowed now
      .\allow-pos-address.ps1 -Remove 103.209.220.154           # take an address off again

  An address without "http://" and port covers every port on that server. Then restart Chrome and check
  chrome://policy (the policy should be listed with Status OK).
#>
param(
  [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
  [string[]]$Address = @(),
  [switch]$List,
  [string]$Remove
)

$ErrorActionPreference = 'Stop'
$key = 'HKLM:\SOFTWARE\Policies\Google\Chrome\LocalNetworkAccessAllowedForUrls'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

function Get-Allowed {
  if (-not (Test-Path $key)) { return @() }
  $props = Get-ItemProperty -Path $key
  $props.PSObject.Properties |
    Where-Object { $_.Name -match '^\d+$' } |
    Sort-Object { [int]$_.Name } |
    ForEach-Object { [pscustomobject]@{ Number = [int]$_.Name; Address = [string]$_.Value } }
}

function Show-Allowed {
  $now = @(Get-Allowed)
  if ($now.Count -eq 0) { Write-Host 'No POS addresses are allowed yet.' -ForegroundColor Yellow }
  else { Write-Host 'Allowed for the Printer Agent in Chrome:' -ForegroundColor Cyan; $now | Format-Table -AutoSize | Out-String | Write-Host }
}

if ($List -or (($Address.Count -eq 0) -and -not $Remove)) { Show-Allowed; exit 0 }

if (-not $isAdmin) {
  Write-Host 'Please run PowerShell as Administrator (right-click PowerShell > Run as administrator).' -ForegroundColor Red
  exit 1
}

if (-not (Test-Path $key)) { New-Item -Path $key -Force | Out-Null }

# Accept "http://192.168.1.53:8090/" too: keep only the server address so every port is covered.
function Normalize([string]$a) {
  $a = $a.Trim()
  $a = $a -replace '^[a-zA-Z]+://', ''
  $a = $a -replace '/.*$', ''
  if ($a -match '^\[.*\]') { return $a }          # IPv6 in brackets
  return ($a -replace ':\d+$', '')
}

if ($Remove) {
  $target = Normalize $Remove
  $hit = @(Get-Allowed | Where-Object { $_.Address -eq $target })
  if ($hit.Count -eq 0) { Write-Host "$target was not in the list." -ForegroundColor Yellow }
  foreach ($h in $hit) { Remove-ItemProperty -Path $key -Name ([string]$h.Number); Write-Host "Removed $target" -ForegroundColor Green }
  Show-Allowed
  exit 0
}

foreach ($raw in $Address) {
  $a = Normalize $raw
  if (-not $a) { continue }
  $existing = @(Get-Allowed)
  if ($existing.Address -contains $a) { Write-Host "$a is already allowed." ; continue }
  $next = if ($existing.Count -eq 0) { 1 } else { ($existing | Measure-Object -Property Number -Maximum).Maximum + 1 }
  New-ItemProperty -Path $key -Name ([string]$next) -Value $a -PropertyType String -Force | Out-Null
  Write-Host "Allowed $a" -ForegroundColor Green
}

Show-Allowed
Write-Host 'Now close ALL Chrome windows, open Chrome again and check chrome://policy.' -ForegroundColor Cyan
