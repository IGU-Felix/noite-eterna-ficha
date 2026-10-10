$ErrorActionPreference = "Stop"
$botDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $botDirectory

function Test-Command($name) {
    return $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

function Install-WingetPackage($id, $label) {
    if (-not (Test-Command "winget")) {
        throw "O winget não está disponível. Instale o App Installer da Microsoft Store e execute novamente."
    }
    Write-Host "Instalando $label..."
    winget install --id $id --exact --accept-source-agreements --accept-package-agreements
}

if (-not (Test-Command "py")) {
    Install-WingetPackage "Python.Python.3.14" "Python"
}

if (-not (Test-Command "ffmpeg")) {
    Install-WingetPackage "yt-dlp.FFmpeg" "FFmpeg"
}

if (-not (Test-Command "cloudflared")) {
    Install-WingetPackage "Cloudflare.cloudflared" "Cloudflare Tunnel"
}

py -m pip install --upgrade pip
py -m pip install -r requirements.txt

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
}

$config = Get-Content ".env" -Raw
if ($config -match "(?m)^DISCORD_API_KEY=\s*$" -or $config -notmatch "(?m)^DISCORD_API_KEY=") {
    $bytes = New-Object byte[] 32
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $apiKey = [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
    if ($config -match "(?m)^DISCORD_API_KEY=") {
        $config = [regex]::Replace($config, "(?m)^DISCORD_API_KEY=.*$", "DISCORD_API_KEY=$apiKey")
    } else {
        $config += "`r`nDISCORD_API_KEY=$apiKey`r`n"
    }
    Set-Content ".env" $config -Encoding UTF8
    Write-Host "Chave local da API gerada no arquivo .env."
}

$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "Noite Eterna Bot.lnk"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = (Join-Path $botDirectory "start.vbs")
$shortcut.WorkingDirectory = $botDirectory
$shortcut.Description = "Iniciar o bot de música do Noite Eterna"
$shortcut.Save()

Write-Host ""
Write-Host "Instalação concluída."
Write-Host "1. Abra o aplicativo pelo atalho 'Noite Eterna Bot'."
Write-Host "2. Informe o token do Discord na janela de configuração."
Write-Host "3. Para a ficha na Vercel, execute start-tunnel.bat depois de iniciar o bot."
