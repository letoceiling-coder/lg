# Синхронизация проекта на прод (85.198.64.93 → /var/www/lg) и полный деплой.
# Перед запуском: локально `pnpm typecheck`, `pnpm build:api`, `pnpm build:web`.
# Архив НЕ включает .env на сервере (распаковка с --exclude=.env).
#
# Использование из корня репозитория:
#   powershell -ExecutionPolicy Bypass -File deploy/sync-from-windows.ps1
#   powershell -File deploy/sync-from-windows.ps1 -SkipPack   # только SSH (архив уже в /tmp)

param(
  [string]$Server = "root@85.198.64.93",
  [string]$RemoteTar = "/tmp/lg-sync.tgz",
  [switch]$SkipPack
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not $SkipPack) {
  $tgz = Join-Path (Split-Path $root -Parent) "lg-sync.tgz"
  if (Test-Path $tgz) { Remove-Item $tgz -Force }
  Write-Host "==> Pack $root -> $tgz"
  Push-Location $root
  try {
    tar -czf $tgz `
      --exclude=node_modules `
      --exclude=.git `
      --exclude=TrendAgent/data `
      --exclude=apps/web/dist `
      --exclude=apps/api/dist `
      .
  } finally { Pop-Location }
  $mb = [math]::Round((Get-Item $tgz).Length / 1MB, 2)
  Write-Host "    Archive size: $mb MB"
  Write-Host "==> scp -> $Server`:$RemoteTar"
  scp -o ConnectTimeout=30 $tgz "${Server}:$RemoteTar"
}

$remoteCmd = "cd /var/www/lg && tar -xzf $RemoteTar --exclude='./.env' --exclude='.env' && bash deploy/deploy-full.sh"
Write-Host "==> Remote: extract (keep .env) + deploy-full.sh"
ssh $Server $remoteCmd
Write-Host "==> Done. deploy-full уже вызывает verify-on-server.sh runtime (PM2 + curl к API)."
Write-Host "    Полная проверка только на сервере: ssh $Server 'cd /var/www/lg && bash deploy/verify-on-server.sh full'"
Write-Host "    Снаружи: curl.exe -sS https://lg.livegrid.ru/api/v1/health"
