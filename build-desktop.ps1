# Script para compilar Infopesca e gerar o instalador .exe
# Execute este script na pasta raiz do projeto

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot

Write-Host "=== Infopesca - Build e Empacotamento Desktop ===" -ForegroundColor Cyan
Write-Host ""

# 1. Build do projeto Vite
Write-Host "[1/4] Compilando projeto React/Vite..." -ForegroundColor Yellow
Set-Location $projectRoot
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Falha no build do Vite!"; exit 1 }
Write-Host "  Build concluido com sucesso!" -ForegroundColor Green

# 2. Instalar dependencias do Electron
Write-Host ""
Write-Host "[2/4] Instalando Electron e electron-builder..." -ForegroundColor Yellow
Set-Location "$projectRoot\electron"
npm install
if ($LASTEXITCODE -ne 0) { Write-Error "Falha ao instalar dependencias do Electron!"; exit 1 }
Write-Host "  Dependencias instaladas!" -ForegroundColor Green

# 3. Gerar o instalador .exe
Write-Host ""
Write-Host "[3/4] Gerando instalador .exe (isso pode levar alguns minutos)..." -ForegroundColor Yellow
if (Test-Path "$projectRoot\electron\release") {
    Remove-Item -Recurse -Force "$projectRoot\electron\release\*" -ErrorAction SilentlyContinue
}
npm run dist
if ($LASTEXITCODE -ne 0) { Write-Error "Falha ao gerar o instalador!"; exit 1 }

# 4. Resultado
Write-Host ""
Write-Host "[4/4] Concluido!" -ForegroundColor Green
Write-Host ""
Write-Host "O instalador foi gerado em: $projectRoot\electron\release\" -ForegroundColor Cyan
Write-Host ""

# Abrir a pasta de saida
$releasePath = "$projectRoot\electron\release"
if (Test-Path $releasePath) {
    Start-Process explorer.exe $releasePath
    Write-Host "Abrindo pasta de saida no Explorer..." -ForegroundColor Gray
}
