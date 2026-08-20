# ============================================================
#  SHIVAM TRANSPORT — START SERVER + CLOUDFLARE TUNNEL
#  Run this script: Right-click → "Run with PowerShell"
# ============================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "   SHIVAM TRANSPORT STARTUP" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

# ── Kill any existing server on port 4000 ──────────────────
$existing = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Stopping old server on port 4000..." -ForegroundColor Cyan
    $existing | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1
}

# ── Start the Node.js backend server in a new window ───────
Write-Host "Starting backend server..." -ForegroundColor Green
$serverScript = Join-Path $PSScriptRoot "backend\server.mjs"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "node `"$serverScript`"" -WindowStyle Normal

# Give server time to start
Start-Sleep -Seconds 2

# ── Find cloudflared ────────────────────────────────────────
# Searches: PATH, this script's folder, Desktop, Downloads
$cloudflaredCmd = $null

# 1. Already on PATH?
if (Get-Command cloudflared -ErrorAction SilentlyContinue) {
    $cloudflaredCmd = "cloudflared"
}

# 2. Next to this script?
if (-not $cloudflaredCmd) {
    $local = Join-Path $PSScriptRoot "cloudflared.exe"
    if (Test-Path $local) { $cloudflaredCmd = $local }
}

# 3. Desktop or Downloads?
foreach ($candidate in @(
    "$env:USERPROFILE\Desktop\cloudflared.exe",
    "$env:USERPROFILE\Downloads\cloudflared.exe",
    "$env:USERPROFILE\Downloads\cloudflared-windows-amd64.exe"
)) {
    if (-not $cloudflaredCmd -and (Test-Path $candidate)) {
        $cloudflaredCmd = $candidate
    }
}

if (-not $cloudflaredCmd) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  CLOUDFLARED NOT FOUND (one-time setup)" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "1. Download cloudflared.exe from:" -ForegroundColor White
    Write-Host "   https://github.com/cloudflare/cloudflared/releases/latest" -ForegroundColor Cyan
    Write-Host "   (pick: cloudflared-windows-amd64.exe)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Rename it to  cloudflared.exe  and place it:" -ForegroundColor White
    Write-Host "   - Next to this script  (recommended), OR" -ForegroundColor Yellow
    Write-Host "   - Anywhere on your PATH" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "3. Run this script again — no account or login needed!" -ForegroundColor White
    Write-Host ""
    Write-Host "   (Drivers on the same WiFi can use the LAN URL below in the meantime)" -ForegroundColor Gray
    $lanIp = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
        Select-Object -First 1).IPAddress
    if ($lanIp) { Write-Host "   http://${lanIp}:4000" -ForegroundColor Green }
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

# ── Start Cloudflare Tunnel (quick / anonymous mode) ───────
# Uses trycloudflare.com — completely free, no login, no account needed.
# URL changes on every restart. For a FIXED permanent URL see CLOUDFLARE_TUNNEL.md.
Write-Host "Starting Cloudflare Tunnel..." -ForegroundColor Green

$logFile = Join-Path $env:TEMP "cloudflared_shivam.log"
Remove-Item $logFile -ErrorAction SilentlyContinue

# Run cloudflared minimized in the background, logging to a temp file so we
# can parse the public URL without blocking this window.
$cfArgs = "tunnel --url http://localhost:4000 --logfile `"$logFile`" --loglevel info"
Start-Process -FilePath $cloudflaredCmd -ArgumentList $cfArgs -WindowStyle Minimized

# Poll the log for up to ~20 seconds for the trycloudflare URL
Write-Host "Waiting for tunnel URL" -ForegroundColor Cyan -NoNewline
$publicUrl = $null
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 500
    Write-Host "." -NoNewline -ForegroundColor Cyan
    if (Test-Path $logFile) {
        $content = Get-Content $logFile -Raw -ErrorAction SilentlyContinue
        if ($content -match 'https://[a-z0-9\-]+\.trycloudflare\.com') {
            $publicUrl = $Matches[0]
            break
        }
    }
}
Write-Host ""

# ── Print results ───────────────────────────────────────────
if ($publicUrl) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "  SERVER IS LIVE — SHARE WITH DRIVERS"  -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  PUBLIC URL (works from ANYWHERE):" -ForegroundColor White
    Write-Host "  $publicUrl" -ForegroundColor Cyan
    Write-Host ""
    $lanIp = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
        Select-Object -First 1).IPAddress
    if ($lanIp) {
        Write-Host "  LAN URL (same WiFi only):" -ForegroundColor Gray
        Write-Host "  http://${lanIp}:4000" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "  Admin login: http://localhost:4000" -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Yellow

    # Copy public URL to clipboard
    $publicUrl | Set-Clipboard
    Write-Host ""
    Write-Host "  URL copied to clipboard!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  NEXT STEP: Paste this URL into the app:" -ForegroundColor White
    Write-Host "  Admin login -> Settings -> Driver Connection -> Server Address" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  NOTE: This URL changes every time you restart." -ForegroundColor Yellow
    Write-Host "  For a FIXED permanent URL, see CLOUDFLARE_TUNNEL.md" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "  Tunnel started but URL was not detected in time." -ForegroundColor Yellow
    Write-Host "  Check the log file for the URL:" -ForegroundColor Gray
    Write-Host "  $logFile" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Or open Task Manager and look for cloudflared.exe" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
