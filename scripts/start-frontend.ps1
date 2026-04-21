Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$frontendPath = Join-Path $root 'frontend'

Write-Host "[frontend] working directory: $frontendPath"
Write-Host '[frontend] starting dev server...'
Set-Location $frontendPath
npm run dev
