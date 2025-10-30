@echo off
REM Windows Batch Script to Fix Email Server
REM This will upload and run the fix script on your mail server

echo ============================================
echo   NOXTM EMAIL SERVER AUTO-FIX
echo ============================================
echo.

echo Step 1: Uploading fix script to mail server...
scp "%~dp0fix-mail-server.sh" root@185.137.122.61:/root/fix-mail-server.sh
if %errorlevel% neq 0 (
    echo ERROR: Failed to upload script. Check your SSH connection.
    pause
    exit /b 1
)
echo SUCCESS: Script uploaded
echo.

echo Step 2: Running fix script on mail server...
echo This may take 1-2 minutes...
echo.
ssh root@185.137.122.61 "chmod +x /root/fix-mail-server.sh && bash /root/fix-mail-server.sh"
if %errorlevel% neq 0 (
    echo ERROR: Fix script failed. Check the output above.
    pause
    exit /b 1
)
echo.

echo ============================================
echo   FIX COMPLETE!
echo ============================================
echo.

echo Step 3: Testing SMTP connection...
cd "%~dp0.."
node -e "const nodemailer = require('nodemailer'); const transporter = nodemailer.createTransport({host: '185.137.122.61', port: 25, secure: false, tls: {rejectUnauthorized: false}}); transporter.verify((err, success) => {if(err) console.log('ERROR:', err.message); else console.log('SUCCESS: SMTP server is ready!');})"
echo.

echo ============================================
echo All done! Your email server should now work.
echo Try signing up at http://noxtm.com/signup
echo ============================================
pause