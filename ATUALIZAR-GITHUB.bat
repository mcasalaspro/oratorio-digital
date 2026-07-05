@echo off
REM ============================================================
REM   Atualizar a TRILHA INFINITA no GitHub (deploy via Render)
REM   COLOQUE ESTE ARQUIVO DENTRO DA PASTA DO PROJETO
REM   (a mesma pasta onde estao package.json e a pasta app)
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
set /p gname=Seu nome (ENTER = mcasalaspro): 
if "%gname%"=="" set gname=mcasalaspro
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

REM --- 4) Endereco do GitHub (ja embutido: mcasalaspro/trilha-infinita) ---
git remote get-url origin >nul 2>nul
if not errorlevel 1 goto tem_remoto
echo.
echo === Ligando ao repositorio https://github.com/mcasalaspro/trilha-infinita.git ...
git remote add origin https://github.com/mcasalaspro/trilha-infinita.git
:tem_remoto

REM --- 5) Verificar o conteudo antes de enviar (evita quebrar o deploy) ---
where npm >nul 2>nul
if errorlevel 1 goto pula_valida
if not exist "node_modules" goto pula_valida
echo.
echo === Verificando o conteudo (npm run validar)... ===
call npm run validar
if errorlevel 1 goto valida_falhou
goto valida_ok
:valida_falhou
echo.
echo [ATENCAO] A validacao encontrou erros (veja as mensagens acima).
echo Se enviar assim, a publicacao no Render vai FALHAR.
set /p continuar=Enviar mesmo assim? (S = sim / N = nao) [N]: 
if /I "%continuar%"=="S" goto valida_ok
echo.
echo Envio cancelado. Corrija os erros e rode este arquivo de novo.
echo.
pause
goto fim
:pula_valida
echo (Pulando a validacao: Node/npm ou a pasta node_modules nao foram encontrados.)
:valida_ok

echo.
echo === O que mudou ===
git status --short
echo.

REM --- 6) Mensagem do commit ---
set /p msg=Descreva o que mudou (ENTER = "atualizacoes"): 
if "%msg%"=="" set msg=atualizacoes

echo.
echo === Adicionando arquivos... ===
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
echo  PRONTO! O codigo foi enviado para o GitHub.
echo.
echo  A Render detecta a mudanca e REPUBLICA o site sozinha:
echo    1) Abra o painel da Render e veja a aba de deploy/logs.
echo    2) Em ~1 a 2 minutos o novo deploy fica pronto.
echo    3) Endereco do site (quando o servico ja estiver criado):
echo         https://trilha-infinita.onrender.com/
echo.
echo  OBS 1: na 1a vez o Git pode abrir o navegador pedindo login
echo         do GitHub. E normal -- faca o login e o envio continua.
echo  OBS 2: a Render so publica se voce ja tiver criado o Web
echo         Service ligado a este repositorio (veja o manual).
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
