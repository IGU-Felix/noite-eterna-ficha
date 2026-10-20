@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>&1
if errorlevel 1 (
    echo Python nao foi encontrado no PATH.
    echo Instale o Python 3.11 ou mais recente e tente novamente.
    pause
    exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
    echo Criando o ambiente Python do bot...
    py -m venv .venv
    if errorlevel 1 (
        echo Nao foi possivel criar o ambiente Python.
        pause
        exit /b 1
    )
)

echo Instalando ou atualizando as dependencias do bot...
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 (
    echo Falha ao instalar as dependencias do bot.
    pause
    exit /b 1
)

echo Ambiente do bot pronto.
pause
