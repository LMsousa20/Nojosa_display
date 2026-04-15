@echo off
REM Script de Setup para Build Android APK

echo.
echo ========================================
echo  CFD PDV - Setup Android Build
echo ========================================
echo.

REM Verificar se Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js não está instalado!
    echo    Baixe em: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js encontrado

REM Verificar se Android SDK está instalado
if not exist "%LOCALAPPDATA%\Android\Sdk" (
    echo.
    echo ⚠️  Android SDK não encontrado em: %LOCALAPPDATA%\Android\Sdk
    echo    Instale Android Studio: https://developer.android.com/studio
    pause
    exit /b 1
)
echo ✅ Android SDK encontrado

REM Verificar se Java está instalado
where java >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Java JDK não está instalado!
    echo    Baixe em: https://www.oracle.com/java/technologies/downloads/
    pause
    exit /b 1
)
echo ✅ Java JDK encontrado

echo.
echo ========================================
echo  Tudo pronto para gerar o APK!
echo ========================================
echo.
echo Use o comando:
echo    npm run build:apk
echo.
pause
