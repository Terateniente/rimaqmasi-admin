$ErrorActionPreference = 'Stop'

$frontendRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$workspaceRoot = (Resolve-Path (Join-Path $frontendRoot '..')).Path
$distRoot = Join-Path $frontendRoot 'dist'
$outputRoot = Join-Path $workspaceRoot 'deploy'
$zipPath = Join-Path $outputRoot 'admin-rimaqmasi.zip'

Write-Host '[1/4] Compilando panel administrativo para producción...'
Push-Location $frontendRoot
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación del panel administrativo' }
}
finally {
    Pop-Location
}

if (-not (Test-Path -LiteralPath (Join-Path $distRoot 'index.html'))) {
    throw 'No se encontró dist\index.html'
}
$htaccessPath = Join-Path $distRoot '.htaccess'
if (-not (Test-Path -LiteralPath $htaccessPath)) {
    throw 'No se copió public\.htaccess al paquete dist\'
}

Write-Host '[2/4] Verificando cabeceras de seguridad en .htaccess...'
$htaccessContent = Get-Content -LiteralPath $htaccessPath -Raw
foreach ($requiredHeader in @('Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Strict-Transport-Security')) {
    if ($htaccessContent -notmatch [regex]::Escape($requiredHeader)) {
        throw "Falta la cabecera requerida en .htaccess: $requiredHeader"
    }
}

Write-Host '[3/4] Verificando URL de producción en el bundle...'
$productionUrlFound = Get-ChildItem -LiteralPath (Join-Path $distRoot 'assets') -Filter '*.js' |
    Select-String -SimpleMatch 'https://api.rimaqmasi.com/api/v1' -Quiet
if (-not $productionUrlFound) {
    throw 'El build no contiene la URL de producción del API (https://api.rimaqmasi.com/api/v1)'
}

New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

Write-Host '[4/4] Creando ZIP listo para admin.rimaqmasi.com...'
tar -a -cf $zipPath -C $distRoot .
if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el ZIP del panel administrativo' }

$zip = Get-Item -LiteralPath $zipPath
Write-Host ''
Write-Host 'Paquete productivo listo:'
Write-Host $zip.FullName
Write-Host ("Tamaño: {0:N2} MB" -f ($zip.Length / 1MB))
Write-Host 'Tras subir el paquete al hosting, ejecuta: npm run smoke'
