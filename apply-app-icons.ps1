Add-Type -AssemblyName System.Drawing

$root = (Get-Location).Path

# 1. Imagem que fara parte do sistema como um todo (logo/sistema)
$systemImagePath = 'C:\Users\David\Downloads\Design sem nome (9).png'

# 2. Imagem que sera APENAS icone do app (Windows .exe e Android .apk)
$iconImagePath = 'C:\Users\David\Downloads\Happy hour no Boteco (3).png'

if (-not (Test-Path $systemImagePath)) {
    Write-Error "Imagem do sistema nao encontrada em: $systemImagePath"
    exit 1
}

if (-not (Test-Path $iconImagePath)) {
    Write-Error "Imagem do icone nao encontrada em: $iconImagePath"
    exit 1
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   Atualizando Imagens do Sistema e Icones do App " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# --- A. APLICAR IMAGEM DO SISTEMA ---
Write-Host "`n[1/3] Aplicando imagem do sistema (logo)..." -ForegroundColor Yellow
$destLogo = Join-Path $root "public\images\logo.png"
$destSysCopy = Join-Path $root "public\images\Design sem nome (9).png"
Copy-Item -Path $systemImagePath -Destination $destLogo -Force
Copy-Item -Path $systemImagePath -Destination $destSysCopy -Force
Write-Host "  -> Atualizado: $destLogo" -ForegroundColor Green

# --- B. PROCESSAR E GERAR ÍCONES DO APP ---
Write-Host "`n[2/3] Processando imagem para icones (.exe e .apk)..." -ForegroundColor Yellow
$iconBmp = [System.Drawing.Bitmap]::FromFile($iconImagePath)
Write-Host "  -> Imagem de icone: $($iconBmp.Width)x$($iconBmp.Height)" -ForegroundColor Gray

function Save-ResizedPng {
    param(
        [System.Drawing.Bitmap]$source,
        [int]$width,
        [int]$height,
        [string]$destPath,
        [bool]$circleClip = $false
    )

    $parentDir = Split-Path $destPath
    if (-not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }

    $bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    if ($circleClip) {
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddEllipse(0, 0, $width, $height)
        $g.SetClip($path)
    }

    $g.DrawImage($source, 0, 0, $width, $height)
    $g.Dispose()

    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "  -> Gerado: $destPath ($width x $height)" -ForegroundColor Gray
}

function Save-MultiResIco {
    param(
        [System.Drawing.Bitmap]$source,
        [string]$destPath,
        [int[]]$sizes = @(256, 128, 64, 48, 32, 16)
    )

    $parentDir = Split-Path $destPath
    if (-not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }

    $pngStreams = @()
    foreach ($sz in $sizes) {
        $bmp = New-Object System.Drawing.Bitmap($sz, $sz, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $g.Clear([System.Drawing.Color]::Transparent)
        $g.DrawImage($source, 0, 0, $sz, $sz)
        $g.Dispose()

        $ms = New-Object System.IO.MemoryStream
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        $pngStreams += @{
            Size = $sz
            Bytes = $ms.ToArray()
        }
        $ms.Dispose()
    }

    $fs = [System.IO.File]::Create($destPath)
    $bw = New-Object System.IO.BinaryWriter($fs)

    # Header (ICONDIR)
    $bw.Write([uint16]0)
    $bw.Write([uint16]1)
    $bw.Write([uint16]$pngStreams.Count)

    $offset = 6 + ($pngStreams.Count * 16)
    foreach ($item in $pngStreams) {
        $bWidth = if ($item.Size -ge 256) { [byte]0 } else { [byte]$item.Size }
        $bHeight = if ($item.Size -ge 256) { [byte]0 } else { [byte]$item.Size }
        $bw.Write($bWidth)
        $bw.Write($bHeight)
        $bw.Write([byte]0)
        $bw.Write([byte]0)
        $bw.Write([uint16]1)
        $bw.Write([uint16]32)
        $bw.Write([uint32]$item.Bytes.Length)
        $bw.Write([uint32]$offset)
        $offset += $item.Bytes.Length
    }

    foreach ($item in $pngStreams) {
        $bw.Write($item.Bytes)
    }

    $bw.Flush()
    $bw.Close()
    $fs.Close()
    Write-Host "  -> Gerado ICO: $destPath (tamanhos: $($sizes -join ', '))" -ForegroundColor Green
}

# --- B1. Ícones do Desktop (.exe / Windows) ---
Write-Host "  -> Criando icones para Windows Desktop (.exe)..." -ForegroundColor Yellow
$faviconIco = Join-Path $root "public\favicon.ico"
$electronIco = Join-Path $root "electron\icon.ico"
$electronBuildIco = Join-Path $root "electron\build\icon.ico"
$electronPng = Join-Path $root "electron\icon.png"
$electronBuildPng = Join-Path $root "electron\build\icon.png"

Save-MultiResIco -source $iconBmp -destPath $faviconIco
Save-MultiResIco -source $iconBmp -destPath $electronIco
Save-MultiResIco -source $iconBmp -destPath $electronBuildIco
Save-ResizedPng -source $iconBmp -width 512 -height 512 -destPath $electronPng
Save-ResizedPng -source $iconBmp -width 512 -height 512 -destPath $electronBuildPng

# --- B2. Ícones do Android (.apk) ---
Write-Host "  -> Criando icones para Android (.apk)..." -ForegroundColor Yellow
$androidRes = Join-Path $root "android\app\src\main\res"

$androidConfigs = @(
    @{ Folder = "mipmap-mdpi";    LauncherSize = 48;  FgSize = 108 },
    @{ Folder = "mipmap-hdpi";    LauncherSize = 72;  FgSize = 162 },
    @{ Folder = "mipmap-xhdpi";   LauncherSize = 96;  FgSize = 216 },
    @{ Folder = "mipmap-xxhdpi";  LauncherSize = 144; FgSize = 324 },
    @{ Folder = "mipmap-xxxhdpi"; LauncherSize = 192; FgSize = 432 }
)

foreach ($cfg in $androidConfigs) {
    $folderPath = Join-Path $androidRes $cfg.Folder
    $launcherPath = Join-Path $folderPath "ic_launcher.png"
    $roundPath = Join-Path $folderPath "ic_launcher_round.png"
    $fgPath = Join-Path $folderPath "ic_launcher_foreground.png"

    # ic_launcher.png (Quadrado padrao)
    Save-ResizedPng -source $iconBmp -width $cfg.LauncherSize -height $cfg.LauncherSize -destPath $launcherPath

    # ic_launcher_round.png (Circular com antialiasing)
    Save-ResizedPng -source $iconBmp -width $cfg.LauncherSize -height $cfg.LauncherSize -destPath $roundPath -circleClip $true

    # ic_launcher_foreground.png (Foreground para Adaptive Icons)
    Save-ResizedPng -source $iconBmp -width $cfg.FgSize -height $cfg.FgSize -destPath $fgPath
}

$iconBmp.Dispose()
Write-Host "`n[3/3] Todas as imagens foram trocadas e configuradas com sucesso!" -ForegroundColor Green
