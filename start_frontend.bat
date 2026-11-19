@echo off
echo ============================================
echo  Investment Strategy Lab - Frontend
echo  React + Vite en http://localhost:5173
echo ============================================
echo.

rem Ejecutar siempre desde la carpeta frontend, aunque se lance con doble clic.
cd /d "%~dp0frontend"

rem Node.js: el del PATH o, si no, la instalación de usuario por defecto.
set NODEDIR=%LOCALAPPDATA%\Programs\nodejs
if exist "%NODEDIR%\node.exe" set PATH=%NODEDIR%;%PATH%

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] No se encuentra Node.js / npm. Instala Node.js.
    pause
    exit /b 1
)

if not exist node_modules (
    echo Instalando dependencias ^(solo la primera vez^)...
    call npm install
)

echo.
echo Arrancando Vite...
call npm run dev
pause
