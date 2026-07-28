@echo off
title Borrar el repositorio AnisakiGirl
cd /d "%~dp0"

set REPO=lucatonik8/AnisakiGirl

echo.
echo  ============================================================
echo    BORRAR EL REPOSITORIO DE GITHUB
echo  ============================================================
echo.
echo    Repositorio : %REPO%
echo    Web         : https://lucatonik8.github.io/AnisakiGirl/
echo.
echo    Esto BORRA el repositorio y tumba la web publicada.
echo    NO se puede deshacer desde aqui.
echo.
echo    Tus fotos y los archivos de esta carpeta NO se tocan:
echo    se quedan en tu ordenador tal cual estan.
echo.

where gh >nul 2>&1
if errorlevel 1 (
  echo  !! No encuentro GitHub CLI ^(gh^). Instalalo desde https://cli.github.com
  goto :fin
)

set "resp="
set /p resp="  Escribe BORRAR y pulsa Enter para confirmar: "
if /i not "%resp%"=="BORRAR" goto :cancelado

echo.
echo  Borrando...
gh repo delete %REPO% --yes
if not errorlevel 1 goto :borrado

echo.
echo  ------------------------------------------------------------
echo   Falta el permiso "delete_repo" en tu sesion de GitHub.
echo   Ahora se abrira el navegador para concederlo (una sola vez).
echo  ------------------------------------------------------------
echo.
set "resp2="
set /p resp2="  Continuar? (S/N): "
if /i not "%resp2%"=="S" goto :cancelado

gh auth refresh -h github.com -s delete_repo
if errorlevel 1 (
  echo.
  echo  !! No se pudo conceder el permiso. Prueba a mano con:
  echo     gh auth refresh -h github.com -s delete_repo
  goto :fin
)

echo.
echo  Reintentando el borrado...
gh repo delete %REPO% --yes
if errorlevel 1 (
  echo.
  echo  !! No se ha podido borrar. Revisa el mensaje de arriba.
  goto :fin
)

:borrado
echo.
git remote remove origin >nul 2>&1
echo  ============================================================
echo   Repositorio borrado. La web ya no esta publicada.
echo  ============================================================
echo.
echo   Tus fotos siguen intactas en esta carpeta.
echo   Si algun dia quieres volver a publicarla:
echo     gh repo create AnisakiGirl --public --source=. --push
echo.
goto :fin

:cancelado
echo.
echo  Cancelado. No se ha borrado nada.

:fin
echo.
pause
