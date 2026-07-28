@echo off
chcp 65001 >nul
title Actualizar galeria de fotos
cd /d "%~dp0"

echo.
echo  ========================================
echo   Actualizando la galeria de fotos...
echo  ========================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0generar-lista.ps1"
if errorlevel 1 goto :error

git add -A
git diff --cached --quiet && (
  echo.
  echo  No hay cambios que subir. Todo estaba al dia.
  goto :fin
)

git commit -m "Actualizar fotos de la galeria"
if errorlevel 1 goto :error

git push
if errorlevel 1 goto :error

echo.
echo  ========================================
echo   Listo. La web se actualiza en 1-2 min.
echo  ========================================

:fin
echo.
pause
exit /b 0

:error
echo.
echo  !! Ha ocurrido un error. Revisa el mensaje de arriba.
echo.
pause
exit /b 1
