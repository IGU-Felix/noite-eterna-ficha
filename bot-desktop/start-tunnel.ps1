$ErrorActionPreference = "Stop"
$botDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $botDirectory

$listener = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
if (-not $listener) {
    Start-Process -FilePath (Join-Path $botDirectory "start.vbs")
    Start-Sleep -Seconds 3
}

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    throw "Cloudflare Tunnel não está instalado. Execute install.ps1 primeiro."
}

Write-Host "Iniciando túnel HTTPS para a API local..."
Write-Host "Copie a URL https://*.trycloudflare.com exibida abaixo para VITE_BOT_API_URL na Vercel."
cloudflared tunnel --url http://127.0.0.1:3001
