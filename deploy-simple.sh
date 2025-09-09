#!/bin/bash

# Simple deployment script - just push and deploy
echo "🚀 Simple Deployment Process"
echo "=============================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this from the project root"
    exit 1
fi

# Add all changes
echo "📝 Adding all changes..."
git add .

# Commit with timestamp
echo "💾 Committing changes..."
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')"

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

echo "✅ Code pushed to GitHub!"
echo ""
echo "🔄 GitHub Actions will automatically deploy to production"
echo "📊 Check deployment status at: https://github.com/yourusername/noxtmstudio/actions"
echo ""
echo "⏱️  Deployment usually takes 2-3 minutes"
