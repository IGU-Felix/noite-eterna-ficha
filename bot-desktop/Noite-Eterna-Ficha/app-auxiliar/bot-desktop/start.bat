@echo off
cd /d "%~dp0"
if not exist "%~dp0.venv\Scripts\pythonw.exe" (
    echo Ambiente do bot nao encontrado.
    echo Execute Noite-Eterna-Instalador.exe para preparar o aplicativo.
    pause
    exit /b 1
)
set "NOITE_ETERNA_DATA_DIR=%~dp0"
start "" /b "%~dp0.venv\Scripts\pythonw.exe" "%~dp0main.py"
exit /b 0
