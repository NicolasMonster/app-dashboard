# Script para deployment desde Windows a ads.elevatearg.com
# Ejecutar en PowerShell como Administrador

$SERVER = "72.60.157.10"
$USER = "root"
$PASSWORD = "SomosELEVATE655+"

Write-Host "🚀 Deployment a ads.elevatearg.com" -ForegroundColor Green
Write-Host ""

# Verificar si existe plink (PuTTY)
if (-not (Get-Command plink -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  No se encontró 'plink' (PuTTY)" -ForegroundColor Yellow
    Write-Host "Descargando plink.exe..." -ForegroundColor Yellow

    $plinkUrl = "https://the.earth.li/~sgtatham/putty/latest/w64/plink.exe"
    $plinkPath = "$env:TEMP\plink.exe"

    try {
        Invoke-WebRequest -Uri $plinkUrl -OutFile $plinkPath
        Write-Host "✅ plink.exe descargado" -ForegroundColor Green
        $PLINK = $plinkPath
    } catch {
        Write-Host "❌ Error descargando plink. Instala PuTTY manualmente desde https://putty.org" -ForegroundColor Red
        exit 1
    }
} else {
    $PLINK = "plink"
}

# Verificar si existe pscp (PuTTY SCP)
if (-not (Get-Command pscp -ErrorAction SilentlyContinue)) {
    Write-Host "Descargando pscp.exe..." -ForegroundColor Yellow

    $pscpUrl = "https://the.earth.li/~sgtatham/putty/latest/w64/pscp.exe"
    $pscpPath = "$env:TEMP\pscp.exe"

    try {
        Invoke-WebRequest -Uri $pscpUrl -OutFile $pscpPath
        Write-Host "✅ pscp.exe descargado" -ForegroundColor Green
        $PSCP = $pscpPath
    } catch {
        Write-Host "❌ Error descargando pscp. Instala PuTTY manualmente desde https://putty.org" -ForegroundColor Red
        exit 1
    }
} else {
    $PSCP = "pscp"
}

Write-Host ""
Write-Host "📤 Subiendo script de deployment al servidor..." -ForegroundColor Cyan

# Copiar script al servidor
echo y | & $PSCP -pw $PASSWORD "deploy-to-server.sh" "${USER}@${SERVER}:/root/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error copiando archivo al servidor" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Script subido correctamente" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 Ejecutando deployment en el servidor..." -ForegroundColor Cyan
Write-Host ""

# Ejecutar script en el servidor
& $PLINK -batch -pw $PASSWORD "${USER}@${SERVER}" "chmod +x /root/deploy-to-server.sh && /root/deploy-to-server.sh"

Write-Host ""
Write-Host "✅ Deployment completado!" -ForegroundColor Green
Write-Host "🌐 Tu aplicación debería estar disponible en: http://ads.elevatearg.com" -ForegroundColor Green
