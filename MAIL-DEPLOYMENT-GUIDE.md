# Mail Frontend Deployment Guide

## Overview
This guide covers deploying the mail.noxtm.com application to the production server at 185.137.122.61.

---

## Prerequisites

✅ **Required**:
- Production build created (`mail-frontend/build/` directory)
- SSH access to server (185.137.122.61)
- Nginx installed on server
- DNS configured (mail.noxtm.com → 185.137.122.61)
- Backend running on port 5000

🔧 **Optional**:
- SSL certificate for mail.noxtm.com (or wildcard *.noxtm.com)
- PM2 for process management

---

## Deployment Options

### Option 1: Automated Deployment (Recommended)

Run the automated deployment script:

```bash
./deploy-mail-frontend.sh
```

This script will:
1. Build the mail-frontend for production
2. Create `/var/www/mail-noxtm` directory on server
3. Upload build files via SCP
4. Upload and configure Nginx
5. Set correct permissions
6. Reload Nginx
7. Check SSL certificate status

**Time**: ~5 minutes

---

### Option 2: Manual Deployment

If you prefer manual control, follow these steps:

#### Step 1: Build Production Bundle

```bash
cd mail-frontend
npm run build
cd ..
```

**Verify**: Check that `mail-frontend/build/` directory contains:
- `index.html`
- `static/` folder with JS and CSS

---

#### Step 2: Upload Build to Server

**Create directory on server**:
```bash
ssh root@185.137.122.61
mkdir -p /var/www/mail-noxtm
exit
```

**Upload build files**:
```bash
scp -r mail-frontend/build/* root@185.137.122.61:/var/www/mail-noxtm/
```

**Alternative using rsync** (faster, preserves permissions):
```bash
rsync -avz --progress mail-frontend/build/ root@185.137.122.61:/var/www/mail-noxtm/
```

---

#### Step 3: Configure Nginx

**Upload Nginx configuration**:
```bash
scp nginx-mail-noxtm.conf root@185.137.122.61:/etc/nginx/sites-available/mail-noxtm
```

**Enable the site**:
```bash
ssh root@185.137.122.61
ln -s /etc/nginx/sites-available/mail-noxtm /etc/nginx/sites-enabled/mail-noxtm
```

**Test Nginx configuration**:
```bash
nginx -t
```

If test passes:
```bash
systemctl reload nginx
```

---

#### Step 4: Set Permissions

```bash
ssh root@185.137.122.61
chown -R www-data:www-data /var/www/mail-noxtm
chmod -R 755 /var/www/mail-noxtm
```

---

#### Step 5: SSL Certificate

**Check if certificate exists**:
```bash
ssh root@185.137.122.61
ls -la /etc/letsencrypt/live/mail.noxtm.com/
```

**If certificate doesn't exist, create it**:

**Option A: Single domain certificate**:
```bash
certbot --nginx -d mail.noxtm.com
```

**Option B: Wildcard certificate** (recommended):
```bash
certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials /root/.secrets/cloudflare.ini \
  -d *.noxtm.com -d noxtm.com
```

Then update `nginx-mail-noxtm.conf` to use wildcard cert:
```nginx
ssl_certificate /etc/letsencrypt/live/noxtm.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/noxtm.com/privkey.pem;
```

**Reload Nginx after SSL setup**:
```bash
systemctl reload nginx
```

---

## Verification Steps

### 1. Check DNS Resolution

```bash
nslookup mail.noxtm.com
# Should return: 185.137.122.61
```

### 2. Check Nginx Status

```bash
ssh root@185.137.122.61
systemctl status nginx
```

Expected output: `active (running)`

### 3. Check Files Uploaded

```bash
ssh root@185.137.122.61
ls -la /var/www/mail-noxtm/
```

Expected files:
```
total XX
drwxr-xr-x  www-data www-data  index.html
drwxr-xr-x  www-data www-data  static/
-rw-r--r--  www-data www-data  manifest.json
-rw-r--r--  www-data www-data  favicon.ico
```

### 4. Test HTTP → HTTPS Redirect

```bash
curl -I http://mail.noxtm.com
```

Expected: `301 Moved Permanently` with `Location: https://mail.noxtm.com`

### 5. Test HTTPS Access

```bash
curl -I https://mail.noxtm.com
```

Expected: `200 OK`

### 6. Test API Proxy

```bash
curl https://mail.noxtm.com/api/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected: User profile JSON response

### 7. Test in Browser

1. Open https://mail.noxtm.com
2. Should see Login page
3. Login with noxtm.com credentials
4. Should redirect to /inbox
5. Verify email features work

### 8. Test SSO (Cross-Subdomain)

1. Login at https://noxtm.com
2. Open new tab → https://mail.noxtm.com
3. Should automatically be logged in (SSO!)
4. Verify cookie domain is `.noxtm.com`

---

## Troubleshooting

### Issue: 502 Bad Gateway

**Cause**: Backend not running or not accessible

**Solution**:
```bash
ssh root@185.137.122.61
pm2 status
# If backend not running:
cd /exe/noxtm/Backend
pm2 start server.js --name noxtm-backend
pm2 save
```

---

### Issue: 404 Not Found on Refresh

**Cause**: Nginx not configured for React Router

**Solution**: Verify `nginx-mail-noxtm.conf` has:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

---

### Issue: CORS Errors

**Cause**: CORS not configured for mail.noxtm.com

**Solution**: Already fixed in Phase 1! Backend CORS includes:
```javascript
origin: [
  'https://mail.noxtm.com',
  'http://mail.noxtm.com'
]
```

---

### Issue: Cookie Not Shared (SSO Fails)

**Cause**: Cookie domain not set correctly

**Solution**: Verify in Backend server.js:
```javascript
res.cookie('auth_token', token, {
  domain: '.noxtm.com',  // Must have leading dot!
  httpOnly: true,
  secure: true,
  sameSite: 'lax'
});
```

---

### Issue: SSL Certificate Error

**Cause**: Certificate not found or expired

**Solution**:
```bash
# Check certificate
certbot certificates

# Renew if expired
certbot renew

# Create new certificate
certbot --nginx -d mail.noxtm.com
```

---

## Nginx Commands Reference

```bash
# Test configuration
nginx -t

# Reload Nginx (no downtime)
systemctl reload nginx

# Restart Nginx (brief downtime)
systemctl restart nginx

# Check status
systemctl status nginx

# View access logs
tail -f /var/log/nginx/mail-noxtm-access.log

# View error logs
tail -f /var/log/nginx/mail-noxtm-error.log

# List enabled sites
ls -la /etc/nginx/sites-enabled/

# Disable site
rm /etc/nginx/sites-enabled/mail-noxtm
systemctl reload nginx
```

---

## File Locations on Server

| File/Directory | Location |
|----------------|----------|
| Mail frontend files | `/var/www/mail-noxtm/` |
| Nginx config | `/etc/nginx/sites-available/mail-noxtm` |
| Nginx enabled | `/etc/nginx/sites-enabled/mail-noxtm` |
| SSL certificate | `/etc/letsencrypt/live/mail.noxtm.com/` |
| Access logs | `/var/log/nginx/mail-noxtm-access.log` |
| Error logs | `/var/log/nginx/mail-noxtm-error.log` |
| Backend files | `/exe/noxtm/Backend/` |
| Backend .env | `/exe/noxtm/Backend/.env` |

---

## Post-Deployment Checklist

- [ ] DNS configured: mail.noxtm.com → 185.137.122.61
- [ ] Build files uploaded to `/var/www/mail-noxtm/`
- [ ] Nginx configuration created and enabled
- [ ] SSL certificate installed and working
- [ ] Nginx reloaded without errors
- [ ] HTTP redirects to HTTPS
- [ ] Login page loads at https://mail.noxtm.com
- [ ] API requests work (check Network tab)
- [ ] Can login with credentials
- [ ] Inbox page loads correctly
- [ ] All email features functional
- [ ] SSO works from noxtm.com → mail.noxtm.com
- [ ] Logout works correctly
- [ ] WebSocket connections work (real-time updates)

---

## Rollback Procedure

If something goes wrong, quickly rollback:

```bash
ssh root@185.137.122.61

# Disable mail site
rm /etc/nginx/sites-enabled/mail-noxtm
systemctl reload nginx

# Remove files
rm -rf /var/www/mail-noxtm
```

---

## Performance Optimization

After successful deployment, consider:

### 1. Enable Gzip Compression
Already configured in `nginx-mail-noxtm.conf`:
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

### 2. Browser Caching
Already configured for static files:
```nginx
location /static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. CDN (Optional)
Consider using Cloudflare for:
- Global CDN caching
- DDoS protection
- Automatic SSL
- Free tier available

### 4. Monitoring
Set up monitoring for:
```bash
# Check Nginx logs regularly
tail -f /var/log/nginx/mail-noxtm-access.log

# Monitor backend
pm2 monit

# Check SSL expiry
certbot certificates
```

---

## Security Checklist

- [x] HTTPS enabled (SSL certificate)
- [x] HTTP → HTTPS redirect
- [x] HttpOnly cookies (XSS protection)
- [x] Secure cookies (HTTPS only)
- [x] SameSite cookies (CSRF protection)
- [x] CORS properly configured
- [x] Security headers (X-Frame-Options, X-Content-Type-Options)
- [ ] HSTS header (optional - enable after testing)
- [x] JWT token verification server-side
- [x] Backend authentication middleware

---

## Update Procedure

When updating mail-frontend:

```bash
# 1. Rebuild
cd mail-frontend
npm run build

# 2. Upload new build
scp -r build/* root@185.137.122.61:/var/www/mail-noxtm/

# 3. Clear browser cache or hard refresh (Ctrl+F5)
```

**No Nginx reload needed** for frontend updates!

---

## Contact & Support

**Server Details**:
- IP: 185.137.122.61
- User: root
- Password: admin@home

**Domains**:
- Main: noxtm.com (port 3000)
- Mail: mail.noxtm.com (port 3001 → Nginx → static files)
- Backend: localhost:5000 (API endpoints)

**Documentation**:
- Phase 1-4 Complete: [MAIL-SEPARATION-PHASE4-COMPLETE.md](MAIL-SEPARATION-PHASE4-COMPLETE.md)
- Nginx Config: [nginx-mail-noxtm.conf](nginx-mail-noxtm.conf)
- Deployment Script: [deploy-mail-frontend.sh](deploy-mail-frontend.sh)

---

**Status**: Ready for deployment
**Estimated Deployment Time**: 10-15 minutes
**Downtime Required**: None (new service)
