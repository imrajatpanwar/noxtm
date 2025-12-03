# DNS Configuration for mail.noxtm.com

## Overview
Configure DNS records to point mail.noxtm.com to the production server.

**Server IP**: 185.137.122.61
**Domain**: mail.noxtm.com

---

## Required DNS Records

### 1. A Record for mail.noxtm.com

**Record Type**: A
**Name**: mail
**Value**: 185.137.122.61
**TTL**: 3600 (1 hour) or Auto

**Example in DNS Provider**:
```
Type: A
Name: mail
Value: 185.137.122.61
TTL: 3600
```

---

## DNS Providers - Specific Instructions

### Cloudflare (Recommended)

1. Login to Cloudflare dashboard
2. Select **noxtm.com** domain
3. Go to **DNS** tab
4. Click **Add record**
5. Configure:
   - Type: `A`
   - Name: `mail`
   - IPv4 address: `185.137.122.61`
   - Proxy status: **Proxied** (orange cloud) or **DNS only** (gray cloud)
   - TTL: Auto
6. Click **Save**

**Note**: If using "Proxied" mode, Cloudflare provides SSL automatically. If "DNS only", configure Let's Encrypt on server.

---

### GoDaddy

1. Login to GoDaddy account
2. Go to **My Products** → **Domains**
3. Click **DNS** next to noxtm.com
4. Click **Add** in DNS Records section
5. Configure:
   - Type: `A`
   - Name: `mail`
   - Value: `185.137.122.61`
   - TTL: `1 Hour`
6. Click **Save**

---

### Namecheap

1. Login to Namecheap account
2. Go to **Domain List** → select noxtm.com
3. Click **Manage** → **Advanced DNS** tab
4. Click **Add New Record**
5. Configure:
   - Type: `A Record`
   - Host: `mail`
   - Value: `185.137.122.61`
   - TTL: `Automatic`
6. Click **Save All Changes**

---

### Route 53 (AWS)

1. Login to AWS Console
2. Go to **Route 53** service
3. Click **Hosted zones** → select noxtm.com
4. Click **Create record**
5. Configure:
   - Record name: `mail`
   - Record type: `A`
   - Value: `185.137.122.61`
   - TTL: `300`
   - Routing policy: `Simple routing`
6. Click **Create records**

---

### Google Domains

1. Login to Google Domains
2. Select noxtm.com domain
3. Click **DNS** in left sidebar
4. Scroll to **Custom resource records**
5. Add new record:
   - Name: `mail`
   - Type: `A`
   - TTL: `1h`
   - Data: `185.137.122.61`
6. Click **Add**

---

## Verification

### Method 1: nslookup (Windows/Linux/Mac)

```bash
nslookup mail.noxtm.com
```

**Expected output**:
```
Server:  [Your DNS Server]
Address: [DNS Server IP]

Name:    mail.noxtm.com
Address: 185.137.122.61
```

### Method 2: dig (Linux/Mac)

```bash
dig mail.noxtm.com +short
```

**Expected output**:
```
185.137.122.61
```

### Method 3: Online DNS Checker

Visit: https://dnschecker.org
- Enter: `mail.noxtm.com`
- Type: `A`
- Click **Search**

Should show `185.137.122.61` across all locations (may take time to propagate).

### Method 4: ping

```bash
ping mail.noxtm.com
```

**Expected output**:
```
Pinging mail.noxtm.com [185.137.122.61] with 32 bytes of data:
Reply from 185.137.122.61: bytes=32 time=XXms TTL=XX
```

---

## DNS Propagation

DNS changes take time to propagate globally:

- **Cloudflare**: Usually instant to 5 minutes
- **Other providers**: 5 minutes to 48 hours (typically 1-4 hours)

**Check propagation globally**: https://www.whatsmydns.net
- Enter: `mail.noxtm.com`
- Type: `A`

---

## Troubleshooting

### Issue: DNS not resolving

**Possible causes**:
1. DNS record not saved correctly
2. Still propagating (wait 1-4 hours)
3. Wrong record type (should be A, not CNAME)
4. DNS cache on your computer

**Solutions**:

**Clear DNS cache (Windows)**:
```cmd
ipconfig /flushdns
```

**Clear DNS cache (Mac)**:
```bash
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
```

**Clear DNS cache (Linux)**:
```bash
sudo systemd-resolve --flush-caches
```

---

### Issue: Wrong IP resolving

**Cause**: Old DNS record cached

**Solution**:
1. Verify record in DNS provider dashboard
2. Clear local DNS cache (see above)
3. Wait for propagation
4. Use Google DNS for testing:
   ```bash
   nslookup mail.noxtm.com 8.8.8.8
   ```

---

## Optional: Wildcard SSL Setup

If you want to use a single SSL certificate for all subdomains (*.noxtm.com):

### Step 1: Request Wildcard Certificate

On the server:
```bash
certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials /root/.secrets/cloudflare.ini \
  -d *.noxtm.com -d noxtm.com
```

### Step 2: Update Nginx Configuration

Edit `/etc/nginx/sites-available/mail-noxtm`:
```nginx
ssl_certificate /etc/letsencrypt/live/noxtm.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/noxtm.com/privkey.pem;
```

### Step 3: Reload Nginx

```bash
systemctl reload nginx
```

---

## DNS Record Summary

After configuration, your DNS should have:

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| A | @ | 185.137.122.61 | Main site (noxtm.com) |
| A | www | 185.137.122.61 | WWW subdomain |
| A | mail | 185.137.122.61 | Mail application |
| MX | @ | mail.noxtm.com | Email delivery (if using Postfix) |
| TXT | @ | v=spf1... | SPF record (email security) |
| TXT | _dmarc | v=DMARC1... | DMARC policy |

---

## Next Steps After DNS Configuration

1. ✅ DNS configured (mail.noxtm.com → 185.137.122.61)
2. ⏳ Wait for DNS propagation (5 min to 4 hours)
3. ⏳ Verify DNS with `nslookup mail.noxtm.com`
4. ⏳ Deploy mail-frontend to server
5. ⏳ Configure SSL certificate
6. ⏳ Test access at https://mail.noxtm.com

---

**Time Required**: 5-10 minutes (configuration) + 1-4 hours (propagation)
**Difficulty**: Easy
**Reversible**: Yes (can delete DNS record anytime)
