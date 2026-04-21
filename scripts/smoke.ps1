Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $root 'backend'

Write-Host "[1/5] 清理 3000 端口占用..."
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
  ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
  }

Write-Host "[2/5] 启动后端..."
Push-Location $backendPath
$server = Start-Process node -ArgumentList 'server.js' -PassThru
Pop-Location
Start-Sleep -Seconds 1

try {
  Write-Host "[3/5] 创建角色..."
  $createBody = @{ name = 'smoke-user' } | ConvertTo-Json
  $create = Invoke-RestMethod -Uri 'http://localhost:3000/api/character/create' -Method Post -ContentType 'application/json' -Body $createBody
  $characterId = $create.data.characterId
  if (-not $characterId) { throw 'create failed: no characterId' }
  Write-Host "characterId = $characterId"

  Write-Host "[4/5] 结局与重开..."
  $endingBody = @{ characterId = $characterId } | ConvertTo-Json
  $ending = Invoke-RestMethod -Uri 'http://localhost:3000/api/character/ending' -Method Post -ContentType 'application/json' -Body $endingBody
  Write-Host "endingType = $($ending.data.endingType)"

  $restartBody = @{ characterId = $characterId; inheritKey = 'intelligence' } | ConvertTo-Json
  $restart = Invoke-RestMethod -Uri 'http://localhost:3000/api/character/restart' -Method Post -ContentType 'application/json' -Body $restartBody
  Write-Host "newCharacterId = $($restart.data.newCharacterId)"

  Write-Host "[5/5] 关系修复..."
  $repairBody = @{ characterId = $restart.data.newCharacterId; npcId = 'coworker_01'; method = 'apology' } | ConvertTo-Json
  $repair = Invoke-RestMethod -Uri 'http://localhost:3000/api/npc/repair' -Method Post -ContentType 'application/json' -Body $repairBody
  Write-Host "repair delta = $($repair.data.favorabilityChange)"

  Write-Host 'SMOKE PASS'
}
finally {
  if ($server -and !$server.HasExited) {
    Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  }
}
