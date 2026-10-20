@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules" (
    echo Dependencias do site nao encontradas.
    echo Execute npm install uma vez nesta pasta.
    pause
    exit /b 1
)

if not exist "bot-desktop\.venv\Scripts\python.exe" (
    echo Ambiente Python do bot nao encontrado em bot-desktop\.venv.
    echo Execute bot-desktop\setup-dev.bat uma vez e tente novamente.
    pause
    exit /b 1
)

echo Iniciando a ficha em modo de desenvolvimento...
start "Noite Eterna - Ficha" cmd /k "cd /d ""%~dp0"" && npm run dev"

echo Iniciando o bot em modo de desenvolvimento...
start "Noite Eterna - Bot" cmd /k "cd /d ""%~dp0bot-desktop"" && set ""NOITE_ETERNA_DATA_DIR=%~dp0bot-desktop"" && .venv\Scripts\python.exe main.py"

echo Ficha e bot iniciados em janelas separadas.
exit /b 0
