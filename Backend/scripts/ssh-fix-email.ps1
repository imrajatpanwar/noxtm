# PowerShell Script to Fix Email Server
# This will SSH into your server and run the fix

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  NOXTM EMAIL SERVER AUTO-FIX" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$fixScript = Join-Path $scriptPath "fix-mail-server.sh"
$mailServer = "185.137.122.61"

# Step 1: Upload the fix script
Write-Host "Step 1: Uploading fix script to mail server..." -ForegroundColor Yellow
scp $fixScript "root@${mailServer}:/root/fix-mail-server.sh"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to upload script. Check your SSH connection." -ForegroundColor Red
    Write-Host "Make sure you can run: ssh root@$mailServer" -ForegroundColor Yellow
    pause
    exit 1
}
Write-Host "✅ SUCCESS: Script uploaded" -ForegroundColor Green
Write-Host ""

# Step 2: Run the fix script
Write-Host "Step 2: Running fix script on mail server..." -ForegroundColor Yellow
Write-Host "This may take 1-2 minutes..." -ForegroundColor Yellow
Write-Host ""

ssh "root@${mailServer}" "chmod +x /root/fix-mail-server.sh && bash /root/fix-mail-server.sh"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Fix script encountered issues. Check the output above." -ForegroundColor Red
    pause
    exit 1
}
Write-Host ""

Write-Host "============================================" -ForegroundColor Green
Write-Host "  FIX COMPLETE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Step 3: Test the connection
Write-Host "Step 3: Testing SMTP connection from backend..." -ForegroundColor Yellow
Push-Location "$scriptPath\.."
node -e "const nodemailer = require('nodemailer'); const transporter = nodemailer.createTransport({host: '185.137.122.61', port: 25, secure: false, tls: {rejectUnauthorized: false}}); transporter.verify((err, success) => {if(err) {console.log('❌ ERROR:', err.message); process.exit(1);} else console.log('✅ SUCCESS: SMTP server is ready!');})"
Pop-Location

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "🎉 All done! Your email server is working!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Try signing up at: http://noxtm.com/signup" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "⚠️  The fix ran but connection test failed." -ForegroundColor Yellow
    Write-Host "Your hosting provider might be blocking port 25." -ForegroundColor Yellow
    Write-Host "Check the firewall/security group settings." -ForegroundColor Yellow
}

Write-Host ""
pause