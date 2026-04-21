Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $root 'backend'

Write-Host '[backend] clearing port 3000 if occupied...'
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
  ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
  }

Write-Host "[backend] working directory: $backendPath"
Write-Host '[backend] starting server...'
Set-Location $backendPath
node server.js
