#!/bin/bash
# Vercel build script for My Budget Mate

echo "Building My Budget Mate for Vercel..."

# Install dependencies
npm install

# Build frontend only
echo "Building frontend..."
npx vite build

# Create dist structure
mkdir -p dist/public

# Copy built frontend to dist/public
cp -r dist/* dist/public/ 2>/dev/null || echo "No existing dist to copy"

echo "✅ Build complete for Vercel deployment"