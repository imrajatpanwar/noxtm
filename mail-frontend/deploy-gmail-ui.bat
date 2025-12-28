@echo off
echo Deploying Gmail UI to production...
echo.

echo Step 1: Uploading build.tar.gz to server...
scp build.tar.gz root@185.137.122.61:/root/
if %errorlevel% neq 0 (
    echo Error: Failed to upload build file
    pause
    exit /b 1
)

echo Step 2: Extracting and deploying on server...
ssh root@185.137.122.61 "cd /var/www/mail-noxtm && rm -rf * && tar -xzf /root/build.tar.gz -C /var/www/mail-noxtm/ && echo 'Files deployed successfully' && ls -la"
if %errorlevel% neq 0 (
    echo Error: Failed to deploy files
    pause
    exit /b 1
)

echo.
echo ✅ Gmail UI deployed successfully to production!
echo.
pause
