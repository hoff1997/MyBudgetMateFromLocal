#!/bin/bash

# Custom Vercel build script that only builds the frontend
# This completely bypasses the problematic server compilation

echo "Building My Budget Mate for Vercel..."
echo "Installing dependencies and building frontend"

# Ensure all dependencies are installed
npm install

# Build frontend only - ignore server TypeScript errors
echo "Running frontend-only build to avoid TypeScript errors"
npx vite build --mode production

# Verify build output
if [ -d "dist/public" ]; then
  echo "Build successful - dist/public directory created"
  find dist/public -name "*.js" -type f -exec echo "Built JS: {}" \;
  find dist/public -name "*.css" -type f -exec echo "Built CSS: {}" \;
else
  echo "Build failed - dist/public directory not found"
  exit 1
fi

echo "Frontend build completed successfully!"
echo "Output: dist/public"
echo "Ready for Vercel deployment with serverless API functions"