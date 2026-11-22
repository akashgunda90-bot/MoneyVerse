#!/usr/bin/env bash
# Exit on any failure
set -e

echo "=================================================="
echo "  MONEYVERSE 2.0 - Production Render Build Script "
echo "=================================================="

# 1. Install Backend Python Dependencies
echo ">>> Installing Python backend dependencies..."
pip install --upgrade pip
pip install -r backend/requirements.txt

# 2. Install Frontend Node Dependencies
echo ">>> Installing Node.js frontend dependencies..."
cd frontend
if [ -f "package-lock.json" ]; then
    npm ci || npm install
else
    npm install
fi

# 3. Build React Production Bundle
echo ">>> Building Vite/React production assets..."
npm run build
cd ..

echo "=================================================="
echo "  Build completed! Assets ready in frontend/dist  "
echo "=================================================="
