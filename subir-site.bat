@echo off
REM ============================================================
REM   Publicar o Oratorio Digital (envia as mudancas para o GitHub)
REM   Este arquivo fica DENTRO da pasta do projeto (a mesma pasta
REM   onde estao package.json e a pasta src). De dois cliques.
REM   No fim ele diz PRONTO (enviado) ou ERRO (o que falhou).
REM ============================================================
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set "SITE=https://www.oratoriodigital.com"
set "MSGARQ=%TEMP%\oratorio-mensagem.txt"

if not exist "package.json" goto fora_da_pasta

REM --- 1) O Git esta instalado? ---
where git >nul 2>nul
if errorlevel 1 goto sem_git

REM --- 2) Identidade do Git (pergunta so na primeira vez) ---
git config user.email >nul 2>nul
if not errorlevel 1 goto tem_identidade
echo.
echo === Primeira configuracao (so desta vez) ===
set /p "gmail=Seu e-mail do GitHub: "
set /p "gname=Seu nome (pode ser seu usuario): "
git config --global user.email "%gmail%"
git config --global user.name "%gname%"
:tem_identidade

REM --- 3) Repositorio ja iniciado? (so na primeira vez) ---
if exist ".git" goto tem_repo
echo.
echo === Preparando o repositorio pela primeira vez... ===
git init -q
git branch -M main
:tem_repo

REM --- 4) Endereco do GitHub configurado? (so na primeira vez) ---
git remote get-url origin >nul 2>nul
if not errorlevel 1 goto tem_remoto
echo.
echo Ainda nao sei o endereco do seu repositorio no GitHub.
set /p "ghuser=Seu usuario do GitHub: "
set "ghrepo="
set /p "ghrepo=Nome do repositorio (ENTER = oratorio-digital): "
if not defined ghrepo set "ghrepo=oratorio-digital"
git remote add origin "https://github.com/%ghuser%/%ghrepo%.git"
:tem_remoto

REM --- 5) Uma juncao antiga ficou pela metade? ---
if exist ".git\MERGE_HEAD" goto juncao_pendente

REM --- 6) Conferir o conteudo antes (so se o Node estiver instalado) ---
where node >nul 2>nul
if errorlevel 1 goto sem_conferencia
if not exist "node_modules\js-yaml" goto sem_conferencia
if not exist "scripts\validar-conteudo.mjs" goto sem_conferencia
echo.
echo === Conferindo o conteudo... ===
node scripts\validar-conteudo.mjs
if not errorlevel 1 goto sem_conferencia
echo.
echo  Ha arquivos com ERRO (veja acima). Se enviar assim, ESSES arquivos
echo  ficam fora do site ate serem corrigidos; o resto e publicado.
set "resp="
set /p "resp=Enviar mesmo assim? (S = sim, ENTER = nao): "
if /i not "%resp%"=="S" goto cancelado
:sem_conferencia

REM --- 7) Salvar as mudancas (commit) ---
set "MUDOU="
for /f "delims=" %%l in ('git status --porcelain') do set "MUDOU=1"
if defined MUDOU goto salvar
echo.
echo  Nenhuma mudanca nova nesta pasta.
goto sincronizar

:salvar
echo.
echo === O que mudou ===
git status --short
echo.
set "msg="
set /p "msg=Descreva o que mudou (ENTER = atualizacoes): "
if not defined msg set "msg=atualizacoes"
setlocal EnableDelayedExpansion
> "!MSGARQ!" echo(!msg!
endlocal
git add -A
if errorlevel 1 goto erro_salvar
git commit -q -F "%MSGARQ%"
if errorlevel 1 goto erro_salvar
del "%MSGARQ%" >nul 2>nul
echo  Mudancas salvas no computador.

:sincronizar
REM --- 8) Trazer o que ja esta no GitHub (pull) ---
echo.
echo === Sincronizando com o GitHub... ===
git ls-remote --exit-code --heads origin main >nul 2>nul
set "LSR=%errorlevel%"
if "%LSR%"=="2" goto enviar
if not "%LSR%"=="0" goto erro_rede
git pull --no-rebase --no-edit --allow-unrelated-histories -q origin main
if not errorlevel 1 goto ver_pendente
set "CONFLITO="
for /f "delims=" %%f in ('git diff --name-only --diff-filter=U 2^>nul') do set "CONFLITO=1"
if defined CONFLITO goto erro_conflito
goto erro_pull

:ver_pendente
set "PENDENTE=1"
for /f %%n in ('git rev-list --count origin/main..HEAD 2^>nul') do set "PENDENTE=%%n"
if "%PENDENTE%"=="0" goto nada_a_enviar

:enviar
REM --- 9) Enviar (push) ---
echo.
echo === Enviando para o GitHub... ===
git push -u origin main
if errorlevel 1 goto erro_push
echo.
echo ============================================================
echo  PRONTO! Tudo enviado para o GitHub.
echo  Em uns 3 minutos o site atualiza:  %SITE%
echo  Para acompanhar: repositorio no GitHub, aba ACTIONS.
echo  Se algum arquivo tiver erro, so ele fica fora do site e o
echo  GitHub manda um e-mail dizendo qual e o que corrigir.
echo.
echo  OBS: na 1a vez pode abrir o navegador pedindo login do GitHub.
echo       E normal: faca o login e o envio continua sozinho.
echo ============================================================
goto fim_ok

:nada_a_enviar
echo.
echo  Nada novo para enviar: o GitHub ja tem tudo o que esta nesta pasta.
echo  Site: %SITE%
goto fim_ok

:cancelado
echo.
echo  Envio cancelado: nada foi enviado. Corrija os arquivos e de dois
echo  cliques de novo.
goto fim_ok

:juncao_pendente
echo.
echo [ERRO] Uma juncao (merge) de uma tentativa anterior ficou pela metade
echo        nesta pasta. NADA foi enviado. Peca ajuda para terminar a juncao
echo        (ou desfazer com: git merge --abort) e de dois cliques de novo.
goto fim_erro

:erro_salvar
echo.
echo [ERRO] Nao deu para salvar as mudancas (commit). NADA foi enviado.
echo        Veja a mensagem do Git logo acima.
goto fim_erro

:erro_rede
echo.
echo [ERRO] Nao deu para falar com o GitHub. Confira a internet e de dois
echo        cliques de novo. Suas mudancas continuam salvas no computador.
goto fim_erro

:erro_conflito
echo.
echo [ERRO] CONFLITO: estes arquivos foram mudados aqui E tambem no GitHub:
git diff --name-only --diff-filter=U
git merge --abort >nul 2>nul
echo.
echo        Desfiz a juncao: a pasta ficou como estava antes. NADA foi enviado.
echo        Suas mudancas continuam salvas no computador. Peca ajuda para
echo        juntar as duas versoes desses arquivos.
goto fim_erro

:erro_pull
echo.
echo [ERRO] Nao deu para trazer as novidades do GitHub. NADA foi enviado.
echo        Veja a mensagem do Git logo acima.
goto fim_erro

:erro_push
echo.
echo [ERRO] O GitHub RECUSOU o envio: o site NAO foi atualizado.
echo        Causas comuns: o GitHub recebeu outra mudanca enquanto isso
echo        (de dois cliques de novo) ou o login expirou (faca o login
echo        quando o navegador pedir). Veja a mensagem do Git logo acima.
goto fim_erro

:fora_da_pasta
echo.
echo [ERRO] Este arquivo precisa ficar DENTRO da pasta do projeto
echo        (a pasta onde estao package.json e src). Mova e tente de novo.
goto fim_erro

:sem_git
echo.
echo [ERRO] O Git nao esta instalado neste computador.
echo        Instale primeiro (Windows): https://git-scm.com/download/win
echo        Depois de instalar, de dois cliques neste arquivo de novo.
goto fim_erro

:fim_erro
echo.
echo ============================================================
echo  ATENCAO: ALGO FALHOU. O site NAO foi atualizado. Leia acima.
echo ============================================================
echo.
pause
exit /b 1

:fim_ok
echo.
pause
exit /b 0
