@echo off
REM ================================================================
REM  Remove a antiga secao "Missario" do projeto Oratorio Digital.
REM  (A Liturgia do dia substitui o Missario.)
REM  Rode este arquivo DE DENTRO da pasta do projeto, com 2 cliques.
REM ================================================================
chcp 65001 >nul
cd /d "%~dp0"

if not exist "astro.config.mjs" (
  echo.
  echo  [ERRO] Este script precisa rodar na pasta raiz do projeto
  echo         (onde fica o astro.config.mjs). Mova-o para la e rode de novo.
  echo.
  pause
  exit /b 1
)

echo.
echo  Vou remover do projeto:
echo    - src\pages\missario\      (as paginas do Missario)
echo    - src\content\missario\    (o conteudo do Missario)
echo    - public\missario\         (as imagens do Missario)
echo    - PROMPT_NOVO_MISSARIO.md  (o guia do Missario)
echo.
echo  Seu conteudo da Liturgia, oracoes, biografias e textos NAO sao tocados.
echo.
set /p RESP="Confirmar remocao do Missario? (S/N): "
if /I not "%RESP%"=="S" (
  echo Cancelado. Nada foi removido.
  pause
  exit /b 0
)

if exist "src\pages\missario"   rmdir /s /q "src\pages\missario"
if exist "src\content\missario" rmdir /s /q "src\content\missario"
if exist "public\missario"      rmdir /s /q "public\missario"
if exist "PROMPT_NOVO_MISSARIO.md" del /q "PROMPT_NOVO_MISSARIO.md"

echo.
echo  Pronto! Missario removido. Agora gere o site normalmente (subir-site.bat).
echo.
pause
