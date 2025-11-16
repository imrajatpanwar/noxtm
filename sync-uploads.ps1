# Sync uploads to production server
$SERVER = "root@185.137.122.61"
$LOCAL_PATH = "c:\exe\noxtm\Backend\uploads\"
$REMOTE_PATH = "~/noxtm/Backend/uploads/"

Write-Host "`n🚀 Syncing uploads to production server..." -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray

# Sync trade-shows
Write-Host "`n📁 Syncing trade-shows..." -ForegroundColor Yellow
scp -r "$($LOCAL_PATH)trade-shows\*" "$($SERVER):$($REMOTE_PATH)trade-shows/"

# Sync profile-images
Write-Host "`n👤 Syncing profile-images..." -ForegroundColor Yellow
scp -r "$($LOCAL_PATH)profile-images\*" "$($SERVER):$($REMOTE_PATH)profile-images/"

# Set permissions
Write-Host "`n🔐 Setting permissions..." -ForegroundColor Yellow
ssh $SERVER "chmod -R 755 $REMOTE_PATH"

# Verify files
Write-Host "`n📋 Files on server:" -ForegroundColor Yellow
ssh $SERVER "ls -lh $REMOTE_PATH/trade-shows/ 2>/dev/null | tail -n +2"

Write-Host "`n✅ Upload sync complete!" -ForegroundColor Green
Write-Host "=" * 50 -ForegroundColor Gray
Write-Host ""
