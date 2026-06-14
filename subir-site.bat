@echo off
REM ============================================================
REM   Subir o Oratorio Digital para o GitHub (GitHub Pages)
REM   COLOQUE ESTE ARQUIVO DENTRO DA PASTA DO PROJETO
REM   (a mesma pasta onde estao package.json e a pasta src)
REM   e de dois cliques.
REM ============================================================
cd /d "%~dp0"

REM --- 1) O Git esta instalado? ---
where git >nul 2>nul
if errorlevel 1 goto sem_git

REM --- 2) Identidade do Git (pergunta so na primeira vez) ---
git config user.email >nul 2>nul
if not errorlevel 1 goto tem_identidade
echo.
echo === Primeira configuracao (so desta vez) ===
set /p gmail=Seu e-mail do GitHub: 
set /p gname=Seu nome (pode ser seu usuario): 
git config --global user.email "%gmail%"
git config --global user.name "%gname%"
:tem_identidade

REM --- 3) Repositorio ja iniciado? (so na primeira vez) ---
if exist ".git" goto tem_repo
echo.
echo === Preparando o repositorio pela primeira vez... ===
git init
git branch -M main
:tem_repo

REM --- 4) Endereco do GitHub configurado? (so na primeira vez) ---
git remote get-url origin >nul 2>nul
if not errorlevel 1 goto tem_remoto
echo.
echo Ainda nao sei o endereco do seu repositorio no GitHub.
set /p ghuser=Seu usuario do GitHub: 
set /p ghrepo=Nome do repositorio (ENTER = oratorio-digital): 
if "%ghrepo%"=="" set ghrepo=oratorio-digital
git remote add origin https://github.com/%ghuser%/%ghrepo%.git
:tem_remoto

echo.
echo === O que mudou ===
git status --short
echo.

REM --- 5) Mensagem do commit ---
set /p msg=Descreva o que mudou (ENTER = "atualizacoes"): 
if "%msg%"=="" set msg=atualizacoes

echo.
echo === Adicionando arquivos (inclui a pasta .github)... ===
git add -A

echo.
echo === Salvando (commit)... ===
git commit -m "%msg%"

echo.
echo === Sincronizando com o GitHub... ===
git pull origin main --allow-unrelated-histories --no-edit 2>nul

echo.
echo === Enviando pro GitHub... ===
git push -u origin main

echo.
echo ============================================================
echo  PRONTO! Agora, no seu repositorio no GitHub:
echo   1) Abra a aba ACTIONS: deve aparecer "Deploy no GitHub Pages".
echo   2) Em ~2 minutos a bolinha fica verde e o site sobe.
echo   3) Endereco do site (com a barra no final):
echo        https://SEU-USUARIO.github.io/oratorio-digital/
echo.
echo  OBS: na 1a vez pode abrir o navegador pedindo login do GitHub.
echo       E normal -- faca o login e o envio continua sozinho.
echo ============================================================
echo.
pause
goto fim

:sem_git
echo.
echo [ERRO] O Git nao esta instalado neste computador.
echo Instale primeiro (Windows): https://git-scm.com/download/win
echo Depois de instalar, de dois cliques neste arquivo de novo.
echo.
pause

:fim
