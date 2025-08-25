#!/bin/bash

echo "🚀 Starting Noxtm Studio deployment..."

# Navigate to project directory
cd /var/www/noxtmstudio

echo "📥 Pulling latest changes from GitHub..."
git pull origin main

echo "📦 Installing backend dependencies..."
npm install

echo "🔨 Building React frontend..."
cd frontend
npm install
npm run build
cd ..

echo "🔄 Restarting backend service..."
pm2 restart noxtmstudio-backend

echo "✅ Deployment completed successfully!"
echo "🌐 Your app is now running at: http://185.137.122.61"
echo "📊 Check status with: pm2 status" 