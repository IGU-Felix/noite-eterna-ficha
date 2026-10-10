@echo off
cd /d "%~dp0"
if not exist "logs" mkdir "logs"
start "Noite Eterna Bot" /min cmd /c "npm.cmd run server >> logs\server.log 2>&1"
echo Bot iniciado em segundo plano. Consulte logs\server.log para ver os eventos.