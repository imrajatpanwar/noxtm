# Server Setup Checklist for noxtm.com

## SSH into your server:
```bash
ssh root@185.137.122.61
```

## 1. Check Nginx Configuration
```bash
# Check if nginx is running
systemctl status nginx

# Test nginx configuration
nginx -t

# View nginx configuration
cat /etc/nginx/sites-available/default
```

## 2. Verify Domain Configuration
Your nginx config should handle requests for noxtm.com. Check if it includes:
- Server name configuration
- Proper proxy settings to your Node.js app

## 3. Check PM2 Status
```bash
# Check if your app is running
pm2 status

# View logs
pm2 logs noxtmstudio-backend
```

## 4. Test Domain Resolution
After adding DNS records, test:
```bash
# From your local machine
nslookup noxtm.com
ping noxtm.com
```

## 5. SSL Certificate (Optional but Recommended)
If you want HTTPS:
```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d noxtm.com -d www.noxtm.com
```

## 6. Firewall Configuration
Ensure ports 80 and 443 are open:
```bash
ufw status
ufw allow 80
ufw allow 443
```

## Expected Timeline:
- DNS propagation: 5-30 minutes
- Domain should be accessible at: http://noxtm.com
- Optional: https://noxtm.com (after SSL setup)
