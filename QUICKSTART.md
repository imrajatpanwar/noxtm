# 🚀 Quick Start Guide

Get your React MongoDB App running in minutes!

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

## 1. Install Dependencies

```bash
# Install all dependencies (backend + frontend)
npm run install-all
```

## 2. Set Up Environment

```bash
# Copy environment template
cp Backend/env.example Backend/.env

# Edit with your settings
nano Backend/.env
```

**Required settings in `Backend/.env`:**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/react-app
JWT_SECRET=your-super-secret-key-here
```

## 3. Start MongoDB

**Local MongoDB:**
```bash
# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Or use MongoDB Atlas (cloud):**
- Sign up at [MongoDB Atlas](https://www.mongodb.com/atlas)
- Get your connection string
- Update `MONGODB_URI` in `Backend/.env`

## 4. Build & Start

```bash
# Build React app
npm run build

# Start the server
npm start
```

## 5. Test the Application

```bash
# Run automated tests
npm test
```

## 6. Access Your App

- **Frontend**: http://localhost:5000
- **API Health**: http://localhost:5000/api/health

## Development Mode

For development with auto-reload:

```bash
# Terminal 1: Backend with nodemon
npm run dev

# Terminal 2: Frontend with hot reload
cd Frontend && npm start
```

## Deployment

For production deployment on Contabo:

```bash
# Run deployment script
npm run deploy

# Start with PM2
cd Backend && pm2 start ecosystem.config.js
```

## Project Structure

```
├── Frontend/           # React application
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── App.js      # Main app component
│   │   └── index.js    # React entry point
│   └── package.json    # Frontend dependencies
├── Backend/            # Express server
│   ├── server.js       # Main server file
│   ├── package.json    # Backend dependencies
│   ├── ecosystem.config.js # PM2 configuration
│   └── env.example     # Environment template
├── package.json        # Root package.json
└── deploy.sh          # Deployment script
```

## Troubleshooting

### Common Issues:

1. **MongoDB Connection Failed**
   - Check if MongoDB is running
   - Verify connection string in `Backend/.env`
   - Check firewall settings

2. **Port Already in Use**
   - Change PORT in `Backend/.env`
   - Kill existing processes: `lsof -ti:5000 | xargs kill -9`

3. **Build Errors**
   - Clear node_modules: `rm -rf Frontend/node_modules && cd Frontend && npm install`
   - Check Node.js version: `node --version`

### Get Help

- Check the full [README.md](README.md) for detailed instructions
- Review the deployment guide for Contabo server setup
- Test endpoints with: `npm test`

## Features Ready to Use

✅ **User Authentication** - Login/Signup with JWT  
✅ **Protected Routes** - Dashboard access control  
✅ **MongoDB Integration** - User data storage  
✅ **Responsive Design** - Works on all devices  
✅ **Production Ready** - Configured for server deployment  

Your app is now ready! 🎉
