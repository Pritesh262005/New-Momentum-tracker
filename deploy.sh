#!/bin/bash
set -e

echo "🚀 Deploying ALMTS..."

# Pull latest code
echo "📥 Pulling latest code from repository..."
git pull origin main

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install --production
cd ..

# Build frontend
echo "🏗️  Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Create log directory if not exists
sudo mkdir -p /var/log/almts
sudo chown -R $USER:$USER /var/log/almts

# Reload PM2
echo "🔄 Reloading PM2..."
cd backend
pm2 reload ecosystem.config.js --env production
cd ..

# Test and reload Nginx
echo "🌐 Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Deployment complete!"
echo ""
pm2 status
echo ""
echo "🎓 ALMTS is now running!"
