@echo off
setlocal enabledelayedexpansion
title Campo Branco - Instalador Visual

:: Definicao de cores ANSI
set "esc="
for /F "tokens=1,2 delims=#" %%a in ('"prompt #$H#$E# & echo on & for %%b in (1) do rem"') do set "esc=%%b"

set "cyan=%esc%[96m"
set "white=%esc%[97m"
set "yellow=%esc%[93m"
set "green=%esc%[92m"
set "reset=%esc%[0m"
set "bold=%esc%[1m"
set "gray=%esc%[90m"

cls
echo %cyan%=====================================================================%reset%
echo %white%%bold%             CAMPO BRANCO - INSTALADOR VISUAL                      %reset%
echo %cyan%=====================================================================%reset%
echo.
echo  %yellow%Iniciando o servidor do gerenciador...%reset%
echo  %white%A interface abrira automaticamente no seu navegador.%reset%
echo.
echo  %green%Acesse: http://localhost:4000%reset%
echo.
echo  %gray%Mantenha esta janela aberta durante o uso.%reset%
echo.
echo %cyan%=====================================================================%reset%

:: Abrir o navegador
start http://localhost:4000

:: Iniciar os logs do servidor Node
node scripts/manager-server.mjs
