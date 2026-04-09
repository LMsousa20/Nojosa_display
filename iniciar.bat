@echo off
title Sistema CFD - Inicializador
color 0A

echo Verificando dependencias...
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [AVISO] Node.js nao foi encontrado no sistema.
    echo Iniciando instalacao do Node.js atraves do Gerenciador de Pacotes do Windows...
    winget install -e --id OpenJS.NodeJS
    echo.
    echo =======================================================
    echo INSTALACAO CONCLUIDA OU SOLICITADA.
    echo Por favor, feche esta janela e abra o script novamente
    echo para garantir que o sistema reconheca o Node.js.
    echo =======================================================
    pause
    exit
)

echo Node.js detectado!
echo Instalando/Atualizando modulos do sistema (se necessario)...
call npm install --no-audit --no-fund >nul 2>&1

echo.
echo Iniciando o Servidor em segundo plano...
taskkill /F /IM node.exe >nul 2>&1
start /MIN "Servidor CFD" cmd /c "node server.js"

:: Aguarda alguns segundos usando o ping como alternativa compativel com redirecionamento de tela
ping 127.0.0.1 -n 4 >nul

:MENU
cls
echo ==================================================
echo           SISTEMA DE DISPLAY (CFD)
echo ==================================================
echo.
echo Servidor rodando. O que voce deseja fazer?
echo.
echo [1] - INICIAR APLICACAO (Abrir Tela do Cliente)
echo [2] - CONFIGURAR SISTEMA (Abrir Admin)
echo [3] - FECHAR TUDO E SAIR
echo.
set /p escolha="Digite sua opcao (1, 2 ou 3): "

IF "%escolha%"=="1" (
    start http://localhost:3000/index.html
    goto MENU
)
IF "%escolha%"=="2" (
    start http://localhost:3000/admin.html
    goto MENU
)
IF "%escolha%"=="3" (
    echo Encerrando servidor e fechando...
    taskkill /F /IM node.exe >nul 2>&1
    exit
)

echo Opcao Invalida! Tente novamente.
ping 127.0.0.1 -n 3 >nul
goto MENU

