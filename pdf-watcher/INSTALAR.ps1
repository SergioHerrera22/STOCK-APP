# INSTALAR.ps1
# ============================================================
# Instalador gráfico del Vigilante de Facturas PDF
# Sin configuración manual. Solo doble-clic en INSTALAR.bat
# ============================================================

$ErrorActionPreference = "Stop"
$BaseDir = $PSScriptRoot

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# ── Ventana principal ─────────────────────────────────────────────
$form = New-Object System.Windows.Forms.Form
$form.Text = "Instalador – Vigilante de Facturas"
$form.Size = New-Object System.Drawing.Size(520, 400)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false

# ── Título ─────────────────────────────────────────────────────────
$lblTitulo = New-Object System.Windows.Forms.Label
$lblTitulo.Text = "Vigilante de Facturas PDF"
$lblTitulo.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$lblTitulo.AutoSize = $true
$lblTitulo.Location = New-Object System.Drawing.Point(20, 15)
$form.Controls.Add($lblTitulo)

$lblSub = New-Object System.Windows.Forms.Label
$lblSub.Text = "Configura y deja todo corriendo automáticamente al iniciar Windows."
$lblSub.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$lblSub.AutoSize = $true
$lblSub.Location = New-Object System.Drawing.Point(20, 45)
$form.Controls.Add($lblSub)

# ── Separador ──────────────────────────────────────────────────────
$sep = New-Object System.Windows.Forms.Label
$sep.BorderStyle = "Fixed3D"
$sep.Size = New-Object System.Drawing.Size(480, 2)
$sep.Location = New-Object System.Drawing.Point(20, 70)
$form.Controls.Add($sep)

# ── Carpeta de facturas ────────────────────────────────────────────
$lblFolder = New-Object System.Windows.Forms.Label
$lblFolder.Text = "Carpeta donde se guardan los PDFs de facturas:"
$lblFolder.AutoSize = $true
$lblFolder.Location = New-Object System.Drawing.Point(20, 85)
$form.Controls.Add($lblFolder)

$txtFolder = New-Object System.Windows.Forms.TextBox
$txtFolder.Text = "C:\Facturas"
$txtFolder.Size = New-Object System.Drawing.Size(370, 22)
$txtFolder.Location = New-Object System.Drawing.Point(20, 108)
$form.Controls.Add($txtFolder)

$btnBrowse = New-Object System.Windows.Forms.Button
$btnBrowse.Text = "Buscar..."
$btnBrowse.Size = New-Object System.Drawing.Size(80, 24)
$btnBrowse.Location = New-Object System.Drawing.Point(398, 107)
$btnBrowse.Add_Click({
    $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
    $dlg.Description = "Seleccioná la carpeta donde se guardan los PDFs"
    $dlg.SelectedPath = $txtFolder.Text
    if ($dlg.ShowDialog() -eq "OK") {
        $txtFolder.Text = $dlg.SelectedPath
    }
})
$form.Controls.Add($btnBrowse)

# ── Sucursal ───────────────────────────────────────────────────────
$lblSucursal = New-Object System.Windows.Forms.Label
$lblSucursal.Text = "Sucursal de esta PC (baja el stock de aquí):"
$lblSucursal.AutoSize = $true
$lblSucursal.Location = New-Object System.Drawing.Point(20, 145)
$form.Controls.Add($lblSucursal)

$cmbSucursal = New-Object System.Windows.Forms.ComboBox
$cmbSucursal.DropDownStyle = "DropDownList"
$cmbSucursal.Size = New-Object System.Drawing.Size(300, 24)
$cmbSucursal.Location = New-Object System.Drawing.Point(20, 168)
[void]$cmbSucursal.Items.AddRange(@(
    "sucursal_1  →  CAPITAL",
    "sucursal_2  →  RAWSON",
    "sucursal_3  →  FALUCHO",
    "deposito_central  →  DEPÓSITO"
))
$cmbSucursal.SelectedIndex = 0
$form.Controls.Add($cmbSucursal)

# ── Barra de progreso + estado ─────────────────────────────────────
$lblEstado = New-Object System.Windows.Forms.Label
$lblEstado.Text = "Listo para instalar."
$lblEstado.AutoSize = $true
$lblEstado.Location = New-Object System.Drawing.Point(20, 215)
$form.Controls.Add($lblEstado)

$progress = New-Object System.Windows.Forms.ProgressBar
$progress.Size = New-Object System.Drawing.Size(480, 22)
$progress.Location = New-Object System.Drawing.Point(20, 238)
$progress.Minimum = 0
$progress.Maximum = 5
$form.Controls.Add($progress)

# ── Log ───────────────────────────────────────────────────────────
$txtLog = New-Object System.Windows.Forms.TextBox
$txtLog.Multiline = $true
$txtLog.ScrollBars = "Vertical"
$txtLog.ReadOnly = $true
$txtLog.Size = New-Object System.Drawing.Size(480, 60)
$txtLog.Location = New-Object System.Drawing.Point(20, 268)
$txtLog.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 30)
$txtLog.ForeColor = [System.Drawing.Color]::LightGreen
$txtLog.Font = New-Object System.Drawing.Font("Consolas", 8)
$form.Controls.Add($txtLog)

function Log {
    param([string]$msg)
    $txtLog.AppendText("$msg`r`n")
    $txtLog.ScrollToCaret()
    [System.Windows.Forms.Application]::DoEvents()
}

# ── Botones ────────────────────────────────────────────────────────
$btnInstalar = New-Object System.Windows.Forms.Button
$btnInstalar.Text = "INSTALAR Y ACTIVAR"
$btnInstalar.Size = New-Object System.Drawing.Size(200, 32)
$btnInstalar.Location = New-Object System.Drawing.Point(20, 340)
$btnInstalar.BackColor = [System.Drawing.Color]::FromArgb(0, 120, 212)
$btnInstalar.ForeColor = [System.Drawing.Color]::White
$btnInstalar.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$btnInstalar.FlatStyle = "Flat"
$form.Controls.Add($btnInstalar)

$btnCerrar = New-Object System.Windows.Forms.Button
$btnCerrar.Text = "Cerrar"
$btnCerrar.Size = New-Object System.Drawing.Size(80, 32)
$btnCerrar.Location = New-Object System.Drawing.Point(230, 340)
$btnCerrar.Add_Click({ $form.Close() })
$form.Controls.Add($btnCerrar)

# ── Lógica de instalación ─────────────────────────────────────────
$btnInstalar.Add_Click({
    $btnInstalar.Enabled = $false
    $txtLog.Text = ""
    $progress.Value = 0

    # 1) Datos del formulario
    $watchFolder   = $txtFolder.Text.Trim()
    $sucursalRaw   = $cmbSucursal.SelectedItem -split "\s+→\s+" | Select-Object -First 1
    $sucursalId    = $sucursalRaw.Trim()

    $edgeUrl   = "https://vcgkycpkbovwskugcnll.supabase.co/functions/v1/stock-deduct"
    $apiKey    = "stock-secret-2026"

    $VenvDir   = Join-Path $BaseDir ".venv"
    $VenvPy    = Join-Path $VenvDir "Scripts\python.exe"
    $EnvFile   = Join-Path $BaseDir ".env"
    $ReqFile   = Join-Path $BaseDir "requirements.txt"
    $ScriptPy  = Join-Path $BaseDir "watcher.py"
    $TaskName  = "StockWatcherPDF"
    $LogDir    = Join-Path $BaseDir "logs"

    try {
        # ── Paso 1: Python ───────────────────────────────────────
        $lblEstado.Text = "Verificando Python..."
        Log "[1/5] Buscando Python..."

        $pyCmd = Get-Command py -ErrorAction SilentlyContinue
        if (-not $pyCmd) { $pyCmd = Get-Command python -ErrorAction SilentlyContinue }

        if (-not $pyCmd) {
            Log "ERROR: Python no está instalado."
            Log "Descargá Python en https://www.python.org/downloads/ y volvé a correr."
            [System.Windows.Forms.MessageBox]::Show(
                "Python no encontrado.`nDescargá Python desde https://www.python.org/downloads/ e instalalo.`nLuego volvé a ejecutar el instalador.",
                "Falta Python", "OK", "Error")
            $btnInstalar.Enabled = $true
            return
        }
        Log "Python OK: $($pyCmd.Source)"
        $progress.Value = 1

        # ── Paso 2: Virtualenv ───────────────────────────────────
        $lblEstado.Text = "Creando entorno virtual..."
        Log "[2/5] Creando entorno virtual..."
        if (-not (Test-Path $VenvPy)) {
            if ($pyCmd.Name -eq "py") {
                & py -3 -m venv "$VenvDir" 2>&1 | ForEach-Object { Log $_ }
            } else {
                & python -m venv "$VenvDir" 2>&1 | ForEach-Object { Log $_ }
            }
        } else {
            Log "Entorno virtual ya existe, omitiendo."
        }
        $progress.Value = 2

        # ── Paso 3: Dependencias ─────────────────────────────────
        $lblEstado.Text = "Instalando dependencias..."
        Log "[3/5] Instalando dependencias (puede tardar 1-2 min)..."
        & "$VenvPy" -m pip install --upgrade pip -q 2>&1 | ForEach-Object { Log $_ }
        & "$VenvPy" -m pip install -r "$ReqFile" -q 2>&1 | ForEach-Object { Log $_ }
        $progress.Value = 3

        # ── Paso 4: Archivo .env ─────────────────────────────────
        $lblEstado.Text = "Configurando .env..."
        Log "[4/5] Escribiendo configuración..."
        New-Item -ItemType Directory -Force -Path $watchFolder | Out-Null
        New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
        @(
            "WATCH_FOLDER=$watchFolder"
            "UBICACION_VENTA=$sucursalId"
            "EDGE_FUNCTION_URL=$edgeUrl"
            "API_SECRET_KEY=$apiKey"
        ) | Set-Content -LiteralPath $EnvFile -Encoding UTF8
        Log "Carpeta vigilada: $watchFolder"
        Log "Sucursal: $sucursalId"
        $progress.Value = 4

        # ── Paso 5: Tarea Programada (auto-inicio) ───────────────
        $lblEstado.Text = "Registrando inicio automático..."
        Log "[5/5] Creando tarea programada de inicio automático..."

        # Eliminar tarea anterior si existe
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

        $action   = New-ScheduledTaskAction -Execute "`"$VenvPy`"" -Argument "`"$ScriptPy`"" -WorkingDirectory "$BaseDir"
        $trigger  = New-ScheduledTaskTrigger -AtStartup
        $settings = New-ScheduledTaskSettingsSet `
            -AllowStartIfOnBatteries `
            -DontStopIfGoingOnBatteries `
            -StartWhenAvailable `
            -RestartCount 999 `
            -RestartInterval (New-TimeSpan -Minutes 1) `
            -ExecutionTimeLimit ([System.TimeSpan]::Zero)

        # Intentar con SYSTEM (sin contraseña); si falla, con usuario actual
        try {
            Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -User "SYSTEM" -RunLevel Highest -Force | Out-Null
        } catch {
            $user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
            $pass = [System.Windows.Forms.Interaction]::InputBox("Ingresá tu contraseña de Windows para registrar la tarea:", "Contraseña requerida", "")
            Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -User $user -Password $pass -RunLevel Highest -Force | Out-Null
        }

        # Arrancar ya mismo sin reiniciar
        Start-ScheduledTask -TaskName $TaskName
        $progress.Value = 5

        # ── Éxito ────────────────────────────────────────────────
        $lblEstado.Text = "¡Instalación completada!"
        Log ""
        Log "─────────────────────────────────────────"
        Log "✓ Vigilante instalado y en ejecución."
        Log "  Guardá un PDF en: $watchFolder"
        Log "  y el stock se descuenta automáticamente."
        Log "  Log: $BaseDir\watcher.log"
        Log "─────────────────────────────────────────"

        [System.Windows.Forms.MessageBox]::Show(
            "¡Instalación exitosa!`n`nGuardá un PDF de factura en:`n$watchFolder`n`nEl stock se descuenta automáticamente.`nTambién se activa solo al reiniciar Windows.",
            "Instalación completada", "OK", "Information")
    } catch {
        Log "ERROR: $_"
        $lblEstado.Text = "Error durante la instalación."
        [System.Windows.Forms.MessageBox]::Show("Error durante la instalación:`n$_", "Error", "OK", "Error")
        $btnInstalar.Enabled = $true
    }
})

[void]$form.ShowDialog()
