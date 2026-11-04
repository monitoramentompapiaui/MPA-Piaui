# Script para compilar o Infopesca em APK Android (.apk)
# Executa de forma autônoma sem necessitar de permissões de Administrador

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$toolsDir = Join-Path $env:LOCALAPPDATA "MPA-AndroidBuild"
$sdkDir = Join-Path $toolsDir "sdk"
$jdkDir = Join-Path $toolsDir "jdk-21"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   Infopesca - Compilação de Aplicativo Android   " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $toolsDir)) {
    New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null
}

# 1. Configurar JDK 21 Portátil (obrigatório para Capacitor 7)
Write-Host "[1/6] Verificando JDK 21..." -ForegroundColor Yellow
$javac = Join-Path $jdkDir "bin\javac.exe"
if (-not (Test-Path $javac)) {
    Write-Host "  Baixando OpenJDK 21 portátil (Eclipse Temurin)..." -ForegroundColor Gray
    $jdkZip = Join-Path $toolsDir "jdk21.zip"
    $jdkUrl = "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12.1%2B1/OpenJDK21U-jdk_x64_windows_hotspot_21.0.12.1_1.zip"
    
    curl.exe -L -o $jdkZip $jdkUrl
    
    Write-Host "  Extraindo JDK 21..." -ForegroundColor Gray
    $tempExtract = Join-Path $toolsDir "jdk21-temp"
    if (Test-Path $tempExtract) { Remove-Item -Recurse -Force $tempExtract }
    Expand-Archive -Path $jdkZip -DestinationPath $tempExtract -Force
    
    $extractedFolder = Get-ChildItem -Path $tempExtract -Directory | Select-Object -First 1
    if (Test-Path $jdkDir) { Remove-Item -Recurse -Force $jdkDir }
    Move-Item -Path $extractedFolder.FullName -Destination $jdkDir
    Remove-Item -Recurse -Force $tempExtract
    Remove-Item -Force $jdkZip
}
Write-Host "  JDK 21 configurado em: $jdkDir" -ForegroundColor Green

# 2. Configurar Android Command-Line Tools
Write-Host ""
Write-Host "[2/6] Verificando Android SDK Tools..." -ForegroundColor Yellow
$cmdlineDir = Join-Path $sdkDir "cmdline-tools\latest"
$sdkManager = Join-Path $cmdlineDir "bin\sdkmanager.bat"

if (-not (Test-Path $sdkManager)) {
    Write-Host "  Baixando Android Command-Line Tools..." -ForegroundColor Gray
    $toolsZip = Join-Path $toolsDir "cmdline-tools.zip"
    $toolsUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    
    curl.exe -L -o $toolsZip $toolsUrl
    
    Write-Host "  Extraindo Command-Line Tools..." -ForegroundColor Gray
    $tempExtract = Join-Path $toolsDir "cmdline-temp"
    if (Test-Path $tempExtract) { Remove-Item -Recurse -Force $tempExtract }
    Expand-Archive -Path $toolsZip -DestinationPath $tempExtract -Force
    
    $extractedFolder = Join-Path $tempExtract "cmdline-tools"
    if (-not (Test-Path (Split-Path $cmdlineDir))) {
        New-Item -ItemType Directory -Path (Split-Path $cmdlineDir) -Force | Out-Null
    }
    if (Test-Path $cmdlineDir) { Remove-Item -Recurse -Force $cmdlineDir }
    Move-Item -Path $extractedFolder -Destination $cmdlineDir
    Remove-Item -Recurse -Force $tempExtract
    Remove-Item -Force $toolsZip
}
Write-Host "  Android SDK Tools configurado em: $sdkDir" -ForegroundColor Green

# Configurar variáveis de ambiente da sessão
$env:JAVA_HOME = $jdkDir
$env:ANDROID_HOME = $sdkDir
$env:ANDROID_SDK_ROOT = $sdkDir
$env:PATH = "$jdkDir\bin;$sdkDir\platform-tools;$cmdlineDir\bin;$env:PATH"

# 3. Aceitar licenças e baixar platform android-34 e build-tools
Write-Host ""
Write-Host "[3/6] Verificando licenças do Android SDK..." -ForegroundColor Yellow
$licensesDir = Join-Path $sdkDir "licenses"
if (-not (Test-Path $licensesDir)) {
    New-Item -ItemType Directory -Path $licensesDir -Force | Out-Null
}
Set-Content -Path (Join-Path $licensesDir "android-sdk-license") -Value "`n24333f8a63b6825ea9c5514f83c2829b004d1fee`n84831b9409646a3e80f47d76b880e1d14d093f45`nd56f5187479451eabf01fb78af6dfcb131a6481e`n"
Set-Content -Path (Join-Path $licensesDir "android-sdk-preview-license") -Value "`n84831b9409646a3e80f47d76b880e1d14d093f45`n"
Write-Host "  Licenças prontas!" -ForegroundColor Green

# 4. Build dos assets Web (Vite)
Write-Host ""
Write-Host "[4/6] Compilando assets Web do Vite..." -ForegroundColor Yellow
Set-Location $projectRoot
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Falha no build do Vite!"; exit 1 }

# 5. Sincronizar com o Capacitor Android
Write-Host ""
Write-Host "[5/6] Sincronizando com projeto nativo Android..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Error "Falha no cap sync android!"; exit 1 }

# 6. Compilar o APK via Gradle
Write-Host ""
Write-Host "[6/6] Compilando APK Android com Gradle..." -ForegroundColor Yellow
Set-Location (Join-Path $projectRoot "android")
.\gradlew.bat clean assembleDebug --no-daemon
if ($LASTEXITCODE -ne 0) { Write-Error "Falha na compilação do APK pelo Gradle!"; exit 1 }

# Copiar APK para a raiz do projeto
$outputApk = Join-Path $projectRoot "android\app\build\outputs\apk\debug\app-debug.apk"
$destApk = Join-Path $projectRoot "Infopesca.apk"

if (Test-Path $outputApk) {
    Copy-Item -Path $outputApk -Destination $destApk -Force
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "   APK GERADO COM SUCESSO!                        " -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "Arquivo APK: $destApk" -ForegroundColor Cyan
    Write-Host "Tamanho: $((Get-Item $destApk).Length / 1MB) MB" -ForegroundColor Gray
    Write-Host ""
    
    explorer.exe /select,$destApk
} else {
    Write-Error "O arquivo APK não foi encontrado em: $outputApk"
}
