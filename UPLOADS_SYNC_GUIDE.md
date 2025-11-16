# Uploads Synchronization Guide

## Issue Fixed
Images were not showing in production because the `Backend/uploads/` directory is in `.gitignore` and wasn't being pushed to GitHub.

## What Was Done

### 1. ✅ Created Upload Directories on Server
```bash
mkdir -p ~/noxtm/Backend/uploads/trade-shows
mkdir -p ~/noxtm/Backend/uploads/profile-images
```

### 2. ✅ Copied Existing Files to Server
```bash
scp -r c:\exe\noxtm\Backend\uploads\trade-shows\* root@185.137.122.61:~/noxtm/Backend/uploads/trade-shows/
```

### 3. ✅ Set Proper Permissions
```bash
chmod -R 755 ~/noxtm/Backend/uploads/
```

### 4. ✅ Updated Nginx Configuration
Added `/uploads/` location block to proxy uploads through nginx:

```nginx
location /uploads/ {
    proxy_pass http://localhost:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 5. ✅ Restarted Services
```bash
pm2 restart noxtm-backend
pm2 restart noxtm-frontend
systemctl reload nginx
```

## Current Status
- ✅ All uploaded trade show logos are accessible
- ✅ All uploaded floor plans are accessible
- ✅ Backend serves files correctly
- ✅ Nginx proxies uploads properly
- ✅ Images show on production website

## Future Uploads Sync Script

### Windows PowerShell Script
Save as `sync-uploads.ps1`:

```powershell
# Sync uploads to production server
$SERVER = "root@185.137.122.61"
$LOCAL_PATH = "c:\exe\noxtm\Backend\uploads\"
$REMOTE_PATH = "~/noxtm/Backend/uploads/"

Write-Host "Syncing uploads to production..." -ForegroundColor Green

# Sync trade-shows
Write-Host "Syncing trade-shows..." -ForegroundColor Yellow
scp -r "$($LOCAL_PATH)trade-shows\*" "$($SERVER):$($REMOTE_PATH)trade-shows/"

# Sync profile-images
Write-Host "Syncing profile-images..." -ForegroundColor Yellow
scp -r "$($LOCAL_PATH)profile-images\*" "$($SERVER):$($REMOTE_PATH)profile-images/"

# Set permissions
Write-Host "Setting permissions..." -ForegroundColor Yellow
ssh $SERVER "chmod -R 755 $REMOTE_PATH"

Write-Host "✓ Upload sync complete!" -ForegroundColor Green
```

### Linux/Mac Shell Script
Save as `sync-uploads.sh`:

```bash
#!/bin/bash

# Sync uploads to production server
SERVER="root@185.137.122.61"
LOCAL_PATH="/path/to/noxtm/Backend/uploads/"
REMOTE_PATH="~/noxtm/Backend/uploads/"

echo "Syncing uploads to production..."

# Sync trade-shows
echo "Syncing trade-shows..."
scp -r "${LOCAL_PATH}trade-shows/"* "${SERVER}:${REMOTE_PATH}trade-shows/"

# Sync profile-images
echo "Syncing profile-images..."
scp -r "${LOCAL_PATH}profile-images/"* "${SERVER}:${REMOTE_PATH}profile-images/"

# Set permissions
echo "Setting permissions..."
ssh $SERVER "chmod -R 755 $REMOTE_PATH"

echo "✓ Upload sync complete!"
```

## Manual Sync Commands

### Sync specific file
```bash
scp c:\exe\noxtm\Backend\uploads\trade-shows\logo-123.png root@185.137.122.61:~/noxtm/Backend/uploads/trade-shows/
```

### Sync entire directory
```bash
scp -r c:\exe\noxtm\Backend\uploads\trade-shows\* root@185.137.122.61:~/noxtm/Backend/uploads/trade-shows/
```

### Check files on server
```bash
ssh root@185.137.122.61 "ls -lh ~/noxtm/Backend/uploads/trade-shows/"
```

## Testing Image Access

### Test locally
```
http://localhost:5000/uploads/trade-shows/logo-1763157628264-755309789.png
```

### Test production (HTTP)
```
http://noxtm.com/uploads/trade-shows/logo-1763157628264-755309789.png
```

### Test production (HTTPS) - once SSL is configured
```
https://noxtm.com/uploads/trade-shows/logo-1763157628264-755309789.png
```

## Important Notes

1. **Uploads are not in Git**: The `Backend/uploads/` directory is in `.gitignore` for security and size reasons
2. **Manual sync required**: After creating trade shows locally, run the sync script to upload files to production
3. **Permissions matter**: Always set `chmod -R 755` on uploads directory after syncing
4. **Backup regularly**: Consider backing up the uploads directory separately

## Automated Backup Solution (Optional)

Create a cron job on the server to backup uploads:

```bash
# On server, add to crontab (crontab -e)
0 2 * * * tar -czf /root/backups/uploads-$(date +\%Y\%m\%d).tar.gz /root/noxtm/Backend/uploads/
```

This backs up uploads every day at 2 AM.

## Troubleshooting

### Images not loading?
1. Check file exists: `ssh root@185.137.122.61 "ls -la ~/noxtm/Backend/uploads/trade-shows/"`
2. Check permissions: `ssh root@185.137.122.61 "ls -la ~/noxtm/Backend/uploads/"`
3. Check nginx config: `ssh root@185.137.122.61 "cat /etc/nginx/sites-available/noxtm.com"`
4. Check backend logs: `ssh root@185.137.122.61 "pm2 logs noxtm-backend --lines 50"`

### Need to delete old files?
```bash
ssh root@185.137.122.61 "rm ~/noxtm/Backend/uploads/trade-shows/old-file.png"
```

## Files Currently Synced
- ✅ `logo-1762554176136-816849675.png` (83KB)
- ✅ `logo-1763157628264-755309789.png` (33KB)
- ✅ `floorplan-1763157628266-454749892.pdf` (708KB)

## Next Steps for Production
1. Consider setting up rsync for more efficient syncing
2. Set up automated backups of uploads directory
3. Configure SSL/HTTPS for secure image loading
4. Consider using cloud storage (S3, Cloudinary) for production scalability
