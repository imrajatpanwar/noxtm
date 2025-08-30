# Domain Setup Guide for noxtmstudio.com

This guide will help you configure the `noxtmstudio.com` domain on your Contabo server (185.137.122.61).

## Prerequisites

1. **Domain DNS Configuration**: Make sure your domain `noxtmstudio.com` points to your server IP `185.137.122.61`
   - Add an A record: `noxtmstudio.com` → `185.137.122.61`
   - Add an A record: `www.noxtmstudio.com` → `185.137.122.61`

2. **Server Access**: You should have SSH access to your server as root.

## Step-by-Step Setup

### 1. Connect to Your Server

```bash
ssh root@185.137.122.61
```

### 2. Navigate to Your Project Directory

```bash
cd /path/to/your/noxtmstudio
```

### 3. Make Scripts Executable

```bash
chmod +x deploy.sh setup-ssl.sh
```

### 4. Run the Deployment Script

```bash
./deploy.sh
```

This will:
- Install dependencies
- Build the React app
- Create the web directory `/var/www/noxtmstudio.com`
- Copy built files to the web directory

### 5. Install and Configure Nginx

```bash
# Install Nginx if not already installed
sudo apt update
sudo apt install nginx -y

# Copy the Nginx configuration
sudo cp nginx-noxtmstudio.conf /etc/nginx/sites-available/noxtmstudio.com

# Enable the site
sudo ln -sf /etc/nginx/sites-available/noxtmstudio.com /etc/nginx/sites-enabled/

# Remove default site if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

### 6. Set Up SSL Certificates

**Important**: Before running this step, make sure your domain DNS is properly configured and propagated.

```bash
# Run the SSL setup script
sudo ./setup-ssl.sh
```

This script will:
- Install Certbot
- Obtain SSL certificates from Let's Encrypt
- Configure automatic certificate renewal
- Update Nginx configuration for HTTPS

### 7. Configure Environment Variables

```bash
# Navigate to backend directory
cd Backend

# Copy environment example
cp env.example .env

# Edit the environment file
nano .env
```

Update the `.env` file with your production settings:

```env
# Server Configuration
PORT=5000

# MongoDB Configuration (use your production MongoDB URI)
MONGODB_URI=mongodb://localhost:27017/react-app
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/react-app

# JWT Configuration (use a strong secret in production)
JWT_SECRET=your-super-secure-jwt-secret-key-for-production
```

### 8. Install and Configure PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the backend application
cd Backend
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by PM2
```

### 9. Configure MongoDB (if using local MongoDB)

```bash
# Install MongoDB if not already installed
sudo apt update
sudo apt install -y mongodb

# Start MongoDB service
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Check MongoDB status
sudo systemctl status mongodb
```

### 10. Configure Firewall

```bash
# Allow HTTP and HTTPS traffic
sudo ufw allow 'Nginx Full'

# Allow SSH (if UFW is enabled)
sudo ufw allow ssh

# Check firewall status
sudo ufw status
```

## Verification

After completing all steps, your application should be accessible at:

- **HTTPS**: https://noxtmstudio.com
- **HTTPS with www**: https://www.noxtmstudio.com

### Test Your Setup

1. **Frontend**: Visit https://noxtmstudio.com - you should see your React app
2. **Backend API**: Test API endpoint: https://noxtmstudio.com/api/health
3. **SSL Certificate**: Check SSL certificate in your browser

## Troubleshooting

### Common Issues

1. **Domain not accessible**
   - Check DNS propagation: `nslookup noxtmstudio.com`
   - Verify A records point to 185.137.122.61

2. **SSL certificate issues**
   - Ensure domain DNS is properly configured
   - Check if ports 80 and 443 are open
   - Run: `sudo certbot certificates` to check certificate status

3. **Backend API not working**
   - Check if backend is running: `pm2 status`
   - Check logs: `pm2 logs`
   - Verify MongoDB is running: `sudo systemctl status mongodb`

4. **Nginx configuration issues**
   - Test configuration: `sudo nginx -t`
   - Check error logs: `sudo tail -f /var/log/nginx/error.log`

### Useful Commands

```bash
# Check PM2 processes
pm2 status
pm2 logs

# Restart backend
pm2 restart react-mongo-backend

# Check Nginx status
sudo systemctl status nginx

# Reload Nginx configuration
sudo systemctl reload nginx

# Check SSL certificate
sudo certbot certificates

# Renew SSL certificate (manual)
sudo certbot renew
```

## Maintenance

### Regular Tasks

1. **Update SSL certificates**: Automatic renewal is configured, but you can manually renew with:
   ```bash
   sudo certbot renew
   ```

2. **Update application**: When you push changes to GitHub:
   ```bash
   git pull origin main
   ./deploy.sh
   pm2 restart react-mongo-backend
   ```

3. **Monitor logs**:
   ```bash
   pm2 logs
   sudo tail -f /var/log/nginx/access.log
   sudo tail -f /var/log/nginx/error.log
   ```

## Security Recommendations

1. **Keep system updated**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Configure fail2ban** for additional security:
   ```bash
   sudo apt install fail2ban
   ```

3. **Regular backups** of your application and database

4. **Monitor server resources** and application performance

---

**Note**: This setup assumes you're using the production environment. Make sure all sensitive information (JWT secrets, database credentials) are properly secured and not committed to version control.
