# install_service.ps1
# =====================================================
# Instala watcher.py para ejecución automática en Windows
# 1) Si NSSM está disponible: instala como servicio real
# 2) Si NSSM no está disponible: crea Tarea Programada
# =====================================================
#
# EJECUCIÓN (PowerShell como Administrador):
#   .\install_service.ps1

param(
	[string]$PythonExePath = ""
)

$ErrorActionPreference = "Stop"

$NssmPath    = "C:\Tools\nssm\nssm.exe"
$ServiceName = "StockWatcherPDF"
$TaskName    = "StockWatcherPDF_Task"

if ($PythonExePath -and (Test-Path $PythonExePath)) {
	$PythonExe = $PythonExePath
}
else {
	$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
	if ($pythonCmd) {
		$PythonExe = $pythonCmd.Source
	}
	else {
		throw "No se encontró Python. Pasá -PythonExePath o instalá Python."
	}
}
$ScriptPath  = Join-Path $PSScriptRoot "watcher.py"
$LogDir      = Join-Path $PSScriptRoot "logs"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

if (-not (Test-Path $ScriptPath)) {
	throw "No se encontró watcher.py en $ScriptPath"
}

Write-Host "Python: $PythonExe"
Write-Host "Script: $ScriptPath"

if (Test-Path $NssmPath) {
	Write-Host "NSSM detectado. Instalando servicio '$ServiceName'..."

	& $NssmPath install $ServiceName $PythonExe $ScriptPath
	& $NssmPath set $ServiceName AppDirectory $PSScriptRoot
	& $NssmPath set $ServiceName AppStdout "$LogDir\service_stdout.log"
	& $NssmPath set $ServiceName AppStderr "$LogDir\service_stderr.log"
	& $NssmPath set $ServiceName AppRotateFiles 1
	& $NssmPath set $ServiceName AppRotateSeconds 86400
	& $NssmPath set $ServiceName Start SERVICE_AUTO_START
	& $NssmPath set $ServiceName Description "Vigilante de PDFs para descuento automático de stock"

	Write-Host "Iniciando servicio..."
	& $NssmPath start $ServiceName

	Write-Host ""
	Write-Host "✓ Servicio instalado y en ejecución (NSSM)."
	Write-Host "  Comandos útiles:"
	Write-Host "    Detener:     nssm stop $ServiceName"
	Write-Host "    Reiniciar:   nssm restart $ServiceName"
	Write-Host "    Desinstalar: nssm remove $ServiceName confirm"
	Write-Host "    Ver estado:  sc query $ServiceName"
}
else {
	Write-Host "NSSM no disponible. Creando Tarea Programada '$TaskName'..."

	$action = New-ScheduledTaskAction -Execute $PythonExe -Argument "`"$ScriptPath`""
	$trigger = New-ScheduledTaskTrigger -AtStartup
	$settings = New-ScheduledTaskSettingsSet `
		-AllowStartIfOnBatteries `
		-DontStopIfGoingOnBatteries `
		-StartWhenAvailable `
		-RestartCount 999 `
		-RestartInterval (New-TimeSpan -Minutes 1)

	# Ejecuta como SYSTEM para que corra sin sesión de usuario.
	Register-ScheduledTask `
		-TaskName $TaskName `
		-Action $action `
		-Trigger $trigger `
		-Settings $settings `
		-User "SYSTEM" `
		-RunLevel Highest `
		-Force | Out-Null

	Start-ScheduledTask -TaskName $TaskName

	Write-Host ""
	Write-Host "✓ Tarea programada creada y ejecutándose (fallback sin NSSM)."
	Write-Host "  Comandos útiles:"
	Write-Host "    Estado:      Get-ScheduledTask -TaskName $TaskName"
	Write-Host "    Ejecutar:    Start-ScheduledTask -TaskName $TaskName"
	Write-Host "    Detener:     Stop-ScheduledTask -TaskName $TaskName"
	Write-Host "    Eliminar:    Unregister-ScheduledTask -TaskName $TaskName -Confirm:`$false"
}
