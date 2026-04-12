# Запуск из PowerShell: git + полный деплой на сервере.
#   .\deploy\remote-git-deploy.ps1
# Переменные окружения (опционально): $env:LG_SSH, $env:DEPLOY_ROOT, $env:DEPLOY_BRANCH

$ErrorActionPreference = "Stop"
$ssh = if ($env:LG_SSH) { $env:LG_SSH } else { "root@85.198.64.93" }
$deployRoot = if ($env:DEPLOY_ROOT) { $env:DEPLOY_ROOT } else { "/var/www/lg" }
$branch = if ($env:DEPLOY_BRANCH) { $env:DEPLOY_BRANCH } else { "main" }
$repo = if ($env:LG_REPO_URL) { $env:LG_REPO_URL } else { "https://github.com/letoceiling-coder/lg.git" }

$bootstrap = Join-Path $PSScriptRoot "bootstrap-server.sh"
if (-not (Test-Path $bootstrap)) {
  throw "Не найден $bootstrap"
}

Write-Host "=== remote-git-deploy.ps1 -> $ssh DEPLOY_ROOT=$deployRoot ===" -ForegroundColor Cyan

# Пути без пробелов — достаточно для стандартного /var/www/lg
$preamble = "export DEPLOY_ROOT=$deployRoot`nexport DEPLOY_BRANCH=$branch`nexport LG_REPO_URL=$repo`n"
$body = Get-Content -LiteralPath $bootstrap -Raw -Encoding UTF8
$remoteScript = $preamble + $body

$remoteScript | ssh -o BatchMode=yes -o ConnectTimeout=30 $ssh "bash -s"

Write-Host "=== remote-git-deploy.ps1: OK ===" -ForegroundColor Green
