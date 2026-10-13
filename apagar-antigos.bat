@echo off
REM ============================================================
REM   Apaga os arquivos que sairam do site nesta atualizacao
REM   (oracoes duplicadas, a Oracao de Libertacao e uma imagem sem uso).
REM   De dois cliques UMA vez, antes do subir-site.bat. Depois ele se apaga.
REM ============================================================
cd /d "%~dp0"
if not exist "package.json" goto fora
echo.
echo Apagando arquivos antigos...
if exist "src\content\prayers\oracao-anjo-guarda.md" del /q "src\content\prayers\oracao-anjo-guarda.md" && echo   apagado: src\content\prayers\oracao-anjo-guarda.md
if exist "src\content\prayers\oracao-santa-gertrudes-pelas-almas-purgatorio.md" del /q "src\content\prayers\oracao-santa-gertrudes-pelas-almas-purgatorio.md" && echo   apagado: src\content\prayers\oracao-santa-gertrudes-pelas-almas-purgatorio.md
if exist "src\content\prayers\oracao-sao-ricardo-chichester-dia-apos-dia.md" del /q "src\content\prayers\oracao-sao-ricardo-chichester-dia-apos-dia.md" && echo   apagado: src\content\prayers\oracao-sao-ricardo-chichester-dia-apos-dia.md
if exist "src\content\prayers\de-profundis-salmo-129.md" del /q "src\content\prayers\de-profundis-salmo-129.md" && echo   apagado: src\content\prayers\de-profundis-salmo-129.md
if exist "src\content\prayers\novena-santo-antonio.md" del /q "src\content\prayers\novena-santo-antonio.md" && echo   apagado: src\content\prayers\novena-santo-antonio.md
if exist "src\content\prayers\exorcismo-sao-miguel.md" del /q "src\content\prayers\exorcismo-sao-miguel.md" && echo   apagado: src\content\prayers\exorcismo-sao-miguel.md
if exist "public\saints\oracao-anjo-guarda.webp" del /q "public\saints\oracao-anjo-guarda.webp" && echo   apagado: public\saints\oracao-anjo-guarda.webp
if exist "public\saints\oracao-santa-gertrudes-pelas-almas-purgatorio.webp" del /q "public\saints\oracao-santa-gertrudes-pelas-almas-purgatorio.webp" && echo   apagado: public\saints\oracao-santa-gertrudes-pelas-almas-purgatorio.webp
if exist "public\saints\oracao-sao-ricardo-chichester-dia-apos-dia.webp" del /q "public\saints\oracao-sao-ricardo-chichester-dia-apos-dia.webp" && echo   apagado: public\saints\oracao-sao-ricardo-chichester-dia-apos-dia.webp
if exist "public\saints\de-profundis-salmo-129.webp" del /q "public\saints\de-profundis-salmo-129.webp" && echo   apagado: public\saints\de-profundis-salmo-129.webp
if exist "public\saints\novena-santo-antonio.webp" del /q "public\saints\novena-santo-antonio.webp" && echo   apagado: public\saints\novena-santo-antonio.webp
if exist "public\saints\exorcismo-sao-miguel.webp" del /q "public\saints\exorcismo-sao-miguel.webp" && echo   apagado: public\saints\exorcismo-sao-miguel.webp
if exist "public\sobre-bg.webp" del /q "public\sobre-bg.webp" && echo   apagado: public\sobre-bg.webp
echo.
echo PRONTO. Agora de dois cliques no subir-site.bat.
echo.
pause
(goto) 2>nul & del "%~f0"

:fora
echo.
echo [ERRO] Este arquivo precisa ficar DENTRO da pasta do projeto
echo        (a pasta onde estao package.json e src).
echo.
pause
exit /b 1
