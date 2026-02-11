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
echo "Swagger docs: http://localhost:3001/api"
echo ""
echo "📧 SMTP Config: info@goboclean.be via Combell"
echo "📸 Photo uploads: Enhanced error logging enabled"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start the backend
NODE_ENV=development npm run start:dev