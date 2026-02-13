#!/bin/bash

# GoBo Clean Backend Restart Script
# Rebuilds and restarts the backend with enhanced logging

set -e

echo "🔧 GoBo Clean Backend - Restart with Enhanced Logging"
echo "=================================================="

# Navigate to backend directory
cd "$(dirname "$0")"

echo "📦 Installing dependencies..."
npm install

echo "🏗️ Building backend..."
npm run build

echo "🔄 Stopping existing process (if any)..."
pkill -f "node dist/main" || echo "No existing process found"

echo "🚀 Starting backend with enhanced logging..."
echo "Backend will start on port 3001"
echo ""
echo "📚 Swagger docs: http://localhost:3001/api (dev only)"
echo "🧪 Admin test endpoints available in Swagger"
echo "📧 SMTP Config: info@goboclean.be via Combell"
echo "📸 Photo arrays: before_pictures[] & after_pictures[] enabled"
echo ""
echo "🎯 Mission photo arrays now working correctly!"
echo "🔍 Use /admin/missions-test endpoints to debug photos"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start the backend
NODE_ENV=development npm run start:dev