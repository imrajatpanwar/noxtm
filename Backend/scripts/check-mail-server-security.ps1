# SMTP Security Diagnostic Script for Windows
# Run this locally, then SSH to server for actual checks

Write-Host "=========================================="
Write-Host "  SMTP SECURITY DIAGNOSTIC SCRIPT"
Write-Host "=========================================="
Write-Host ""

Write-Host "This script will help you diagnose SMTP issues on your server."
Write-Host "You'll need to SSH into your server (185.137.122.61) to run the actual checks."
Write-Host ""

Write-Host "📋 MANUAL CHECKS TO RUN ON SERVER:"
Write-Host "=========================================="
Write-Host ""

Write-Host "1️⃣  SSH into your server:"
Write-Host "   ssh root@185.137.122.61" -ForegroundColor Yellow
Write-Host ""

Write-Host "2️⃣  Check active SMTP connections:"
Write-Host "   netstat -anp | grep :25 | grep ESTABLISHED" -ForegroundColor Yellow
Write-Host "   (If >10 connections, you have a problem)"
Write-Host ""

Write-Host "3️⃣  Check mail queue:"
Write-Host "   mailq" -ForegroundColor Yellow
Write-Host "   OR" -ForegroundColor Yellow
Write-Host "   postqueue -p" -ForegroundColor Yellow
Write-Host "   (If >100 emails queued, you have a problem)"
Write-Host ""

Write-Host "4️⃣  Check Postfix logs:"
Write-Host "   tail -100 /var/log/mail.log | grep -i 'sent\|error\|reject'" -ForegroundColor Yellow
Write-Host "   OR" -ForegroundColor Yellow
Write-Host "   tail -100 /var/log/maillog | grep -i 'sent\|error\|reject'" -ForegroundColor Yellow
Write-Host ""

Write-Host "5️⃣  Check for suspicious processes:"
Write-Host "   ps aux | grep smtp" -ForegroundColor Yellow
Write-Host ""

Write-Host "6️⃣  Check Postfix configuration:"
Write-Host "   cat /etc/postfix/main.cf | grep -E 'relayhost|mynetworks|smtp'" -ForegroundColor Yellow
Write-Host ""

Write-Host "7️⃣  Check recent logins:"
Write-Host "   last -20" -ForegroundColor Yellow
Write-Host "   lastlog" -ForegroundColor Yellow
Write-Host ""

Write-Host "=========================================="
Write-Host "  IMMEDIATE ACTIONS IF COMPROMISED"
Write-Host "=========================================="
Write-Host ""

Write-Host "🛑 1. Stop Postfix immediately:"
Write-Host "   systemctl stop postfix" -ForegroundColor Red
Write-Host ""

Write-Host "🗑️  2. Flush mail queue:"
Write-Host "   postsuper -d ALL" -ForegroundColor Red
Write-Host ""

Write-Host "🚫 3. Block port 25 temporarily:"
Write-Host "   iptables -A OUTPUT -p tcp --dport 25 -j DROP" -ForegroundColor Red
Write-Host ""

Write-Host "=========================================="
Write-Host "  DOWNLOAD & RUN AUTOMATED SCRIPT"
Write-Host "=========================================="
Write-Host ""

Write-Host "📥 Copy the bash script to your server:" -ForegroundColor Cyan
Write-Host ""
Write-Host "# On your server, run:" -ForegroundColor Yellow
Write-Host "cd /root" -ForegroundColor Yellow
Write-Host "cat > smtp-security-check.sh << 'EOFSCRIPT'
[PASTE THE BASH SCRIPT CONTENT HERE]
EOFSCRIPT" -ForegroundColor Yellow
Write-Host ""
Write-Host "chmod +x smtp-security-check.sh" -ForegroundColor Yellow
Write-Host "sudo ./smtp-security-check.sh" -ForegroundColor Yellow
Write-Host ""

Write-Host "=========================================="
Write-Host "  OR USE SCP TO UPLOAD"
Write-Host "=========================================="
Write-Host ""

$scriptPath = Join-Path $PSScriptRoot "check-mail-server-security.sh"
if (Test-Path $scriptPath) {
    Write-Host "✅ Found bash script at: $scriptPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "Upload it to your server:" -ForegroundColor Cyan
    Write-Host "scp `"$scriptPath`" root@185.137.122.61:/root/smtp-check.sh" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Then SSH in and run:" -ForegroundColor Cyan
    Write-Host "ssh root@185.137.122.61" -ForegroundColor Yellow
    Write-Host "chmod +x /root/smtp-check.sh" -ForegroundColor Yellow
    Write-Host "sudo /root/smtp-check.sh" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  Bash script not found in same directory" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================="
Write-Host "  NEXT STEPS"
Write-Host "=========================================="
Write-Host ""

Write-Host "After diagnosing the issue:"
Write-Host ""
Write-Host "1. Review the diagnostic output"
Write-Host "2. Share results with the team"
Write-Host "3. Implement fixes (rate limiting, port 587, external SMTP)"
Write-Host "4. Reply to hosting provider with your action plan"
Write-Host ""

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
