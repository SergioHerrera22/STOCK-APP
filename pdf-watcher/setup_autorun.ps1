# setup_autorun.ps1
# =====================================================
# One-time setup for PDF watcher auto-run
# Run as Administrator:
#   .\setup_autorun.ps1
# =====================================================

param(
    [string]$WatchFolder = "C:\Facturas",
    [string]$UbicacionVenta = "sucursal_1",
    [string]$EdgeFunctionUrl = "",
    [string]$ApiSecretKey = "",
    [switch]$NonInteractive,
    [switch]$ForceRewriteEnv
)

$ErrorActionPreference = "Stop"

$BaseDir = $PSScriptRoot
$VenvDir = Join-Path $BaseDir ".venv"
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
$Requirements = Join-Path $BaseDir "requirements.txt"
$EnvFile = Join-Path $BaseDir ".env"
$InstallScript = Join-Path $BaseDir "install_service.ps1"

Write-Host "=== Setup PDF Watcher ==="
Write-Host "Folder: $BaseDir"

$AllowedUbicaciones = @("sucursal_1", "sucursal_2", "sucursal_3", "deposito_central")

function Get-EnvValue {
    param(
        [string]$Path,
        [string]$Key
    )
    if (-not (Test-Path $Path)) { return "" }
    $line = Get-Content -LiteralPath $Path | Where-Object { $_ -match "^$Key=" } | Select-Object -First 1
    if (-not $line) { return "" }
    return $line.Substring(($Key + "=").Length)
}

function Write-EnvFile {
    param(
        [string]$Path,
        [string]$WatchFolderValue,
        [string]$UbicacionValue,
        [string]$EdgeUrlValue,
        [string]$ApiKeyValue
    )
    @(
        "WATCH_FOLDER=$WatchFolderValue"
        "UBICACION_VENTA=$UbicacionValue"
        "EDGE_FUNCTION_URL=$EdgeUrlValue"
        "API_SECRET_KEY=$ApiKeyValue"
    ) | Set-Content -LiteralPath $Path -Encoding UTF8
}

# 1) Resolve Python launcher
$PyLauncher = Get-Command py -ErrorAction SilentlyContinue
$PythonCmd = Get-Command python -ErrorAction SilentlyContinue

if (-not $PyLauncher -and -not $PythonCmd) {
    throw "Python not found. Install Python and run again."
}

# 2) Create virtual environment
if (-not (Test-Path $VenvPython)) {
    Write-Host "Creating virtual environment..."
    if ($PyLauncher) {
        & py -3 -m venv "$VenvDir"
    }
    else {
        & python -m venv "$VenvDir"
    }
}
else {
    Write-Host "Virtual environment already exists."
}

# 3) Install dependencies
Write-Host "Installing dependencies..."
& "$VenvPython" -m pip install --upgrade pip
& "$VenvPython" -m pip install -r "$Requirements"

# 4) Build effective config (from args or existing .env)
$existingWatchFolder = Get-EnvValue -Path $EnvFile -Key "WATCH_FOLDER"
$existingUbicacion = Get-EnvValue -Path $EnvFile -Key "UBICACION_VENTA"
$existingEdgeUrl = Get-EnvValue -Path $EnvFile -Key "EDGE_FUNCTION_URL"
$existingApiKey = Get-EnvValue -Path $EnvFile -Key "API_SECRET_KEY"

$effectiveWatchFolder = if ($WatchFolder) { $WatchFolder } elseif ($existingWatchFolder) { $existingWatchFolder } else { "C:\Facturas" }
$effectiveUbicacion = if ($UbicacionVenta) { $UbicacionVenta } elseif ($existingUbicacion) { $existingUbicacion } else { "sucursal_1" }
$effectiveEdgeUrl = if ($EdgeFunctionUrl) { $EdgeFunctionUrl } else { $existingEdgeUrl }
$effectiveApiKey = if ($ApiSecretKey) { $ApiSecretKey } else { $existingApiKey }

if ($effectiveUbicacion -notin $AllowedUbicaciones) {
    throw "UBICACION_VENTA invalida: $effectiveUbicacion. Valores permitidos: $($AllowedUbicaciones -join ', ')"
}

if ($NonInteractive) {
    if ([string]::IsNullOrWhiteSpace($effectiveEdgeUrl) -or [string]::IsNullOrWhiteSpace($effectiveApiKey)) {
        throw "Missing EDGE_FUNCTION_URL/API_SECRET_KEY. Run with -NonInteractive -EdgeFunctionUrl ... -ApiSecretKey ..."
    }
}
else {
    if ([string]::IsNullOrWhiteSpace($effectiveEdgeUrl)) {
        $effectiveEdgeUrl = Read-Host "Edge Function URL (https://.../functions/v1/stock-deduct)"
    }
    if ([string]::IsNullOrWhiteSpace($effectiveApiKey)) {
        $effectiveApiKey = Read-Host "API_SECRET_KEY"
    }
    if ([string]::IsNullOrWhiteSpace($effectiveEdgeUrl) -or [string]::IsNullOrWhiteSpace($effectiveApiKey)) {
        throw "EDGE_FUNCTION_URL and API_SECRET_KEY are required."
    }
}

$shouldWriteEnv = $ForceRewriteEnv -or (-not (Test-Path $EnvFile)) -or $EdgeFunctionUrl -or $ApiSecretKey
if ($shouldWriteEnv) {
    Write-EnvFile -Path $EnvFile -WatchFolderValue $effectiveWatchFolder -UbicacionValue $effectiveUbicacion -EdgeUrlValue $effectiveEdgeUrl -ApiKeyValue $effectiveApiKey
    Write-Host ".env written at $EnvFile"
}
else {
    Write-Host ".env kept as-is at $EnvFile"
}

# 5) Ensure invoice folder exists
if (-not [string]::IsNullOrWhiteSpace($effectiveWatchFolder)) {
    New-Item -ItemType Directory -Path $effectiveWatchFolder -Force | Out-Null
    Write-Host "Invoice folder ready: $effectiveWatchFolder"
}

# 6) Install autorun (NSSM service or scheduled task fallback)
Write-Host "Installing autorun..."
& powershell -ExecutionPolicy Bypass -File "$InstallScript" -PythonExePath "$VenvPython"

Write-Host ""
Write-Host "Setup complete."
Write-Host "Now you only need to save PDFs into WATCH_FOLDER."
Write-Host "Logs: $BaseDir\watcher.log"
