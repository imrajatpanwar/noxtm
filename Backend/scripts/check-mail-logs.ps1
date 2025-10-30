# PowerShell script to check mail logs on remote server
# For Windows users

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📧 MAIL SERVER LOG CHECKER" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$SERVER_IP = "185.137.122.61"

Write-Host "Checking mail logs on $SERVER_IP..." -ForegroundColor Yellow
Write-Host ""

# Test connection
$ping = Test-Connection -ComputerName $SERVER_IP -Count 1 -Quiet

if (-not $ping) {
    Write-Host "❌ Cannot reach $SERVER_IP" -ForegroundColor Red
    Write-Host "   Check your network connection" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Server is reachable" -ForegroundColor Green
Write-Host ""

Write-Host "Please connect via SSH manually and run these commands:" -ForegroundColor Yellow
Write-Host ""
Write-Host "# Connect to server:" -ForegroundColor Cyan
Write-Host "ssh root@$SERVER_IP" -ForegroundColor White
Write-Host ""
Write-Host "# Check mail logs:" -ForegroundColor Cyan
Write-Host "tail -50 /var/log/mail.log | grep -i 'noreply'" -ForegroundColor White
Write-Host "# or" -ForegroundColor Gray
Write-Host "tail -50 /var/log/maillog | grep -i 'noreply'" -ForegroundColor White
Write-Host ""
Write-Host "# Check mail queue:" -ForegroundColor Cyan
Write-Host "mailq" -ForegroundColor White
Write-Host ""
Write-Host "# Check Postfix status:" -ForegroundColor Cyan
Write-Host "systemctl status postfix" -ForegroundColor White
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Look for in the logs:" -ForegroundColor Yellow
Write-Host "  ✅ 'status=sent' - Email delivered successfully" -ForegroundColor Green
Write-Host "  ⚠️  'status=deferred' - Temporary failure, will retry" -ForegroundColor Yellow
Write-Host "  ❌ 'status=bounced' - Permanent failure" -ForegroundColor Red
Write-Host ""

# Alternative: Try using plink (PuTTY) if available
$plinkPath = "C:\Program Files\PuTTY\plink.exe"
if (Test-Path $plinkPath) {
    Write-Host "🔧 PuTTY detected! Attempting automatic connection..." -ForegroundColor Cyan
    Write-Host ""

    $commands = @(
        "tail -50 /var/log/mail.log | grep -i 'noreply' | tail -20",
        "mailq",
        "systemctl status postfix --no-pager | head -10"
    )

    foreach ($cmd in $commands) {
        Write-Host "Running: $cmd" -ForegroundColor Yellow
        & $plinkPath -batch root@$SERVER_IP $cmd
        Write-Host ""
    }
} else {
    Write-Host "💡 Install PuTTY for automatic SSH connections:" -ForegroundColor Yellow
    Write-Host "   https://www.putty.org/" -ForegroundColor White
}
