# start_now.ps1
# Ejecuta watcher.py en primer plano (útil para prueba rápida)

$ErrorActionPreference = "Stop"
$BaseDir = $PSScriptRoot
$VenvPython = Join-Path $BaseDir ".venv\Scripts\python.exe"
$ScriptPath = Join-Path $BaseDir "watcher.py"

if (-not (Test-Path $VenvPython)) {
    throw "No existe .venv. Ejecutá primero .\setup_autorun.ps1"
}

& "$VenvPython" "$ScriptPath"
