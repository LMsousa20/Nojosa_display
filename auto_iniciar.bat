@echo off
cd /d "C:\ACS\Segunda_tela"

node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    exit
)

taskkill /F /IM node.exe >nul 2>&1
start /MIN "Servidor CFD" cmd /c "node server.js"

ping 127.0.0.1 -n 4 >nul

start http://localhost:3000/index.html
exit
