@echo off
echo ============================================
echo  Investment Strategy Lab - Backend
echo  FastAPI + uvicorn en http://localhost:8000
echo ============================================
echo.

rem Ejecutar siempre desde la carpeta backend, aunque se lance con doble clic.
cd /d "%~dp0backend"

rem Python: primero la instalación de usuario de Python 3.11 (evita el alias de la Microsoft Store);
rem si no existe, el "python" del PATH.
set PYTHON=%LOCALAPPDATA%\Programs\Python\Python311\python.exe
if not exist "%PYTHON%" set PYTHON=python

"%PYTHON%" -c "import fastapi, uvicorn, yfinance, pandas" 2>nul
if errorlevel 1 (
    echo [ERROR] Faltan dependencias de Python. Ejecuta:
    echo     "%PYTHON%" -m pip install -r "%~dp0backend\requirements.txt"
    pause
    exit /b 1
)

echo Arrancando backend...
"%PYTHON%" -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
pause
