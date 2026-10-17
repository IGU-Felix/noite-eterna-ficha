@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules" (
    echo Dependencias do site nao encontradas. Execute npm install primeiro.
    pause
    exit /b 1
)

if not exist "..\app-auxiliar\bot-desktop\.env" (
    echo Configure o bot primeiro executando o aplicativo Noite Eterna.
    pause
    exit /b 1
)

echo Gerando a versao online da ficha...
call npm.cmd run build
if errorlevel 1 (
    echo Falha ao gerar a ficha.
    pause
    exit /b 1
)

echo Iniciando o bot local...
start "Noite Eterna Bot" /b wscript.exe "..\app-auxiliar\bot-desktop\start.vbs"
timeout /t 3 /nobreak >nul

echo Iniciando a ficha local...
start "Noite Eterna Ficha" cmd /k "cd /d ""%~dp0"" && node server\host.js"
timeout /t 2 /nobreak >nul

where cloudflared >nul 2>&1
if errorlevel 1 (
    echo Cloudflared nao encontrado. Execute Noite-Eterna-Instalador.exe primeiro.
    pause
    exit /b 1
)

echo.
echo A URL publica sera exibida abaixo. Mantenha esta janela aberta.
cloudflared tunnel --url http://127.0.0.1:4173
