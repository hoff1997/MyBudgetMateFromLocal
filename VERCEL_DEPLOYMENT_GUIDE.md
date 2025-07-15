# Vercel Deployment Guide - Function Limit Solution

## Issue: 12 Serverless Function Limit
Vercel's Hobby plan automatically detects TypeScript files in `/api` directory as serverless functions, causing deployment failure when more than 12 functions exist.

## Complete Solution Applied

### 1. Aggressive API Directory Removal
- **Build Command**: `rm -rf api` removes entire API directory before deployment
- **Ignore Strategy**: `.vercelignore` blocks all source files except `public/`
- **Empty Functions**: `"functions": {}` explicitly declares no serverless functions

### 2. Static-Only Deployment
```json
{
  "buildCommand": "rm -rf api && mkdir -p public && echo '<h1>My Budget Mate</h1><p>Access full app: <a href=\"https://mybudgetmate.replit.app\">mybudgetmate.replit.app</a></p>' > public/index.html",
  "outputDirectory": "public",
  "functions": {}
}
```

### 3. Comprehensive File Blocking
`.vercelignore` strategy:
- Block everything: `*`
- Allow only static output: `!public/` and `!public/**`

## Alternative: GitHub Repository Cleanup
If the error persists, create a separate "vercel-deploy" branch:

```bash
git checkout -b vercel-deploy
rm -rf api server client shared scripts
echo '<h1>My Budget Mate</h1><p>Access: <a href="https://mybudgetmate.replit.app">mybudgetmate.replit.app</a></p>' > index.html
git add .
git commit -m "vercel: static redirect only"
git push origin vercel-deploy
```

Then deploy from the `vercel-deploy` branch in Vercel settings.

## Expected Result
- **Vercel**: Simple redirect page (0 serverless functions)
- **Replit**: Full application with all features
- **GitHub**: Complete source code preserved

## Primary Application
🎯 **https://mybudgetmate.replit.app/** - Complete budgeting application with all 36 envelopes and features