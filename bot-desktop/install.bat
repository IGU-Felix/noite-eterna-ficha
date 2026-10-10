@echo off
setlocal
cd /d "%~dp0"

echo Instalando o Noite Eterna Bot...
where powershell.exe >nul 2>&1
if errorlevel 1 (
    echo ERRO: o Windows PowerShell nao foi encontrado.
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
if errorlevel 1 (
    echo.
    echo A instalacao encontrou um erro.
    pause
    exit /b 1
)

echo.
echo Instalacao concluida com sucesso.
pause
