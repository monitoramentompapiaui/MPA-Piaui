$ErrorActionPreference = "Stop"
$projectDir = $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MPA Piaui - Configuracao Android APK  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $projectDir

# Etapa 1: Instalar Capacitor
Write-Host "[1/5] Instalando Capacitor..." -ForegroundColor Yellow
npm install @capacitor/core @capacitor/cli @capacitor/android
if ($LASTEXITCODE -ne 0) { Write-Error "Falha ao instalar Capacitor"; exit 1 }
Write-Host "     OK" -ForegroundColor Green

# Etapa 2: Build do projeto
Write-Host "[2/5] Gerando build de producao..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Falha no build"; exit 1 }
Write-Host "     OK" -ForegroundColor Green

# Etapa 3: Inicializar Capacitor (usa o capacitor.config.ts que ja criamos)
Write-Host "[3/5] Inicializando Capacitor..." -ForegroundColor Yellow
npx cap init "MPA Piaui" "com.mpa.piaui" --web-dir dist
if ($LASTEXITCODE -ne 0) { Write-Error "Falha ao inicializar Capacitor"; exit 1 }
Write-Host "     OK" -ForegroundColor Green

# Etapa 4: Adicionar plataforma Android
Write-Host "[4/5] Adicionando plataforma Android..." -ForegroundColor Yellow
npx cap add android
if ($LASTEXITCODE -ne 0) { Write-Error "Falha ao adicionar Android"; exit 1 }
Write-Host "     OK" -ForegroundColor Green

# Etapa 5: Sincronizar
Write-Host "[5/5] Sincronizando arquivos..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Error "Falha ao sincronizar"; exit 1 }
Write-Host "     OK" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Configuracao concluida com sucesso!   " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Proximo passo: Abrir o Android Studio" -ForegroundColor Cyan
Write-Host "Execute: npx cap open android" -ForegroundColor White
Write-Host ""
