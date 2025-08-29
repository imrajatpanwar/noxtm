# NoxtmStudio - React MongoDB App

A full-stack web application built with React, Node.js, Express, and MongoDB. Perfect for deployment on Contabo servers.

## Features

- **User Authentication**: Login and signup with JWT tokens
- **Secure Backend**: Express.js API with MongoDB integration
- **Modern Frontend**: React with responsive design
- **Production Ready**: Configured for server deployment
- **Simple Setup**: No complex build tools, just plain JavaScript

## Project Structure

```
├── Frontend/              # React application
│   ├── public/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── App.js         # Main app component
│   │   └── index.js       # React entry point
│   └── package.json       # Frontend dependencies
├── Backend/               # Express server
│   ├── server.js          # Main server file
│   ├── package.json       # Backend dependencies
│   ├── ecosystem.config.js # PM2 configuration
│   ├── test-app.js        # Testing script
│   └── env.example        # Environment variables template
├── package.json           # Root package.json
├── deploy.sh             # Deployment script
└── README.md             # This file
```

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/imrajatpanwar/noxtmstudio.git
   cd noxtmstudio
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   npm run install-backend
   
   # Install client dependencies
   npm run install-frontend
   
   # Or install all at once
   npm run install-all
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp Backend/env.example Backend/.env
   
   # Edit .env with your configuration
   nano Backend/.env
   ```

4. **Configure MongoDB**
   - For local development: Install MongoDB locally
   - For production: Use MongoDB Atlas or your preferred cloud provider
   - Update `MONGODB_URI` in your `.env` file

5. **Start the application**
   ```bash
   # Development mode (runs both frontend and backend)
   npm run dev
   
   # Or run separately:
   # Terminal 1: Backend
   npm start
   
   # Terminal 2: Frontend
   cd Frontend
   npm start
   ```

## Deployment on Contabo Server

### 1. Server Setup

1. **Connect to your Contabo server via SSH**
   ```bash
   ssh root@your-server-ip
   ```

2. **Install Node.js and npm**
   ```bash
   # Update system
   apt update && apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   apt-get install -y nodejs
   
   # Verify installation
   node --version
   npm --version
   ```

3. **Install MongoDB** (if using local MongoDB)
   ```bash
   # Install MongoDB
   wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
   sudo apt-get update
   sudo apt-get install -y mongodb-org
   
   # Start MongoDB
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

### 2. Application Deployment

1. **Upload your code to the server**
   ```bash
   # From your local machine
   scp -r . root@your-server-ip:/var/www/noxtmstudio
   ```

2. **SSH into your server and navigate to the project**
   ```bash
   ssh root@your-server-ip
   cd /var/www/noxtmstudio
   ```

3. **Install dependencies**
   ```bash
   npm run install-all
   ```

4. **Build the React app**
   ```bash
   npm run build
   ```

5. **Set up environment variables**
   ```bash
   cp Backend/env.example Backend/.env
   nano Backend/.env
   ```
   
   Update the `.env` file with your production settings:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/noxtmstudio
   JWT_SECRET=your-very-long-random-secret-key-here
   ```

### 3. Process Management with PM2

1. **Install PM2**
   ```bash
   npm install -g pm2
   ```

2. **Start the application**
   ```bash
   cd Backend
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### 4. Nginx Configuration (Optional)

1. **Install Nginx**
   ```bash
   apt install nginx -y
   ```

2. **Create Nginx configuration**
   ```bash
   nano /etc/nginx/sites-available/noxtmstudio
   ```

   Add this content:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Enable the site**
   ```bash
   ln -s /etc/nginx/sites-available/noxtmstudio /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

### 5. SSL Certificate (Optional)

1. **Install Certbot**
   ```bash
   apt install certbot python3-certbot-nginx -y
   ```

2. **Obtain SSL certificate**
   ```bash
   certbot --nginx -d your-domain.com
   ```

## API Endpoints

- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/profile` - Get user profile (protected)
- `GET /api/dashboard` - Get dashboard data (protected)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/noxtmstudio |
| `JWT_SECRET` | JWT signing secret | your-secret-key |

## Development

### Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start development server with nodemon
- `npm run build` - Build the React app
- `npm run install-all` - Install both server and client dependencies

### Adding New Features

1. **Backend**: Add new routes in `Backend/server.js`
2. **Frontend**: Create new components in `Frontend/src/components/`
3. **Database**: Add new schemas in `Backend/server.js`

## Security Considerations

- Change the default JWT secret in production
- Use HTTPS in production
- Implement rate limiting for API endpoints
- Add input validation and sanitization
- Use environment variables for sensitive data

## Troubleshooting

### Common Issues

1. **MongoDB connection failed**
   - Check if MongoDB is running
   - Verify connection string in `.env`
   - Check firewall settings

2. **Port already in use**
   - Change PORT in `.env`
   - Kill existing processes: `lsof -ti:5000 | xargs kill -9`

3. **Build errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility

## License

MIT License - feel free to use this project for your own applications.
