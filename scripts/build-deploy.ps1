$ErrorActionPreference = 'Stop'

$frontendRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$workspaceRoot = (Resolve-Path (Join-Path $frontendRoot '..')).Path
$distRoot = Join-Path $frontendRoot 'dist'
$outputRoot = Join-Path $workspaceRoot 'deploy'
$zipPath = Join-Path $outputRoot 'admin-rimaqmasi.zip'

Write-Host '[1/3] Compilando panel administrativo...'
Push-Location $frontendRoot
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación del administrador' }
}
finally {
    Pop-Location
}

if (-not (Test-Path -LiteralPath (Join-Path $distRoot 'index.html'))) {
    throw 'No se encontró dist\index.html'
}
if (-not (Test-Path -LiteralPath (Join-Path $distRoot '.htaccess'))) {
    throw 'No se copió .htaccess al paquete'
}

Write-Host '[2/3] Verificando URL de producción...'
$productionUrlFound = Get-ChildItem -LiteralPath (Join-Path $distRoot 'assets') -Filter '*.js' |
    Select-String -SimpleMatch 'https://api.rimaqmasi.com/api/v1' -Quiet
if (-not $productionUrlFound) {
    throw 'El build no contiene la URL de producción del API'
}

New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

Write-Host '[3/3] Creando ZIP para admin.rimaqmasi.com...'
tar -a -cf $zipPath -C $distRoot .
if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el ZIP del administrador' }

$zip = Get-Item -LiteralPath $zipPath
Write-Host ''
Write-Host 'Panel administrativo listo:'
Write-Host $zip.FullName
Write-Host ("Tamaño: {0:N2} MB" -f ($zip.Length / 1MB))
