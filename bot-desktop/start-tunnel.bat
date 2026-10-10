@echo off
setlocal
cd /d "%~dp0"

where powershell.exe >nul 2>&1
if errorlevel 1 (
    echo ERRO: o Windows PowerShell nao foi encontrado.
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-tunnel.ps1"
if errorlevel 1 (
    echo.
    echo Nao foi possivel iniciar o Cloudflare Tunnel.
    pause
    exit /b 1
)
