@echo off
:: INSTALAR.bat
:: =====================================================
:: Doble-clic para instalar el vigilante de facturas.
:: Pide permisos de administrador automáticamente.
:: =====================================================

:: Reiniciar como administrador si hace falta
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Solicitando permisos de administrador...
    powershell -Command "Start-Process -FilePath '%~dpnx0' -Verb RunAs"
    exit /b
)

:: Correr el instalador PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0INSTALAR.ps1"
pause
