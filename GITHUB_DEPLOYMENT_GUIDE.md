# GitHub to Vercel Deployment Guide

## 📋 Prerequisites

1. **GitHub Account** with repository access
2. **Vercel Account** (free tier available)
3. **Database** (Supabase, Neon, or PostgreSQL)

## 🚀 Step-by-Step Deployment

### 1. Push to GitHub

Your repository is already connected to GitHub at: `https://github.com/hoff1997/MyBudgetMate.git`

To push your latest changes:

```bash
# Stage all changes
git add .

# Commit changes
git commit -m "feat: complete My Budget Mate application with dual deployment"

# Push to GitHub
git push origin main
```

### 2. Deploy to Vercel

#### Option A: One-Click Deploy (Recommended)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/hoff1997/MyBudgetMate)

#### Option B: Manual Deployment
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository: `hoff1997/MyBudgetMate`
4. Configure build settings (should auto-detect from `vercel.json`)
5. Add environment variables (see below)
6. Click "Deploy"

### 3. Environment Variables Setup

Add these environment variables in Vercel dashboard:

#### Required Variables
```bash
JWT_SECRET=your-super-secret-jwt-key-here-min-32-chars
```

#### Optional Database Variables
```bash
# For Supabase (recommended)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
STORAGE_TYPE=supabase

# OR for direct PostgreSQL
DATABASE_URL=postgresql://username:password@host:port/database
STORAGE_TYPE=database
```

#### Demo Mode (No Database)
```bash
STORAGE_TYPE=memory
```

### 4. Generate Secure JWT Secret

```bash
# Method 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Method 2: Using OpenSSL  
openssl rand -hex 32

# Method 3: Online Generator
# Visit: https://generate-secret.vercel.app/32
```

### 5. Database Setup (Optional)

#### Option A: Supabase (Recommended)
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Get URL and anon key from Settings > API
4. Add to Vercel environment variables

#### Option B: Neon Database
1. Go to [neon.tech](https://neon.tech)
2. Create new project  
3. Copy connection string
4. Add as `DATABASE_URL` in Vercel

### 6. Verify Deployment

After deployment, test these endpoints:

```bash
# Health check
curl https://your-app.vercel.app/api/ping

# Authentication (should return login page)
curl https://your-app.vercel.app/api/auth/login

# Frontend (should return HTML)
curl https://your-app.vercel.app/
```

## 🔧 Build Configuration

The `vercel.json` file configures:

```json
{
  "buildCommand": "npx vite build",
  "outputDirectory": "dist/public", 
  "functions": {
    "api/**/*.ts": {
      "runtime": "@vercel/node@3.0.0"
    }
  }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check TypeScript errors in build logs
   - Ensure all dependencies are in `package.json`
   - Verify Node.js version compatibility

2. **Environment Variables**
   - JWT_SECRET must be at least 32 characters
   - Database URLs must be properly formatted
   - STORAGE_TYPE must match your configuration

3. **API Errors**
   - Check function logs in Vercel dashboard
   - Verify database connectivity
   - Confirm authentication flow

### Debug Commands

```bash
# Test Vercel functions locally
npx vercel dev

# Check build output
npx vite build && ls -la dist/

# Validate environment
node -e "console.log(process.env.JWT_SECRET?.length || 'Not set')"
```

## 📊 Monitoring

### Vercel Dashboard
- Function logs and analytics
- Build and deployment history
- Performance metrics
- Error tracking

### Application Health
- `/api/ping` - Server health check
- `/api/auth/user` - Authentication status
- Browser developer tools for frontend debugging

## 🔄 Continuous Deployment

Once connected to GitHub:

1. **Automatic Deployments**: Every push to `main` triggers a new deployment
2. **Preview Deployments**: Pull requests get preview URLs
3. **Rollback**: Easy rollback to previous deployments
4. **Branch Deployments**: Deploy specific branches for testing

## 🌐 Custom Domain (Optional)

1. Go to Vercel project settings
2. Add your custom domain
3. Configure DNS records as instructed
4. SSL certificate automatically provisioned

## 📈 Performance Optimization

- **Edge Functions**: API routes run at edge locations globally
- **Static Assets**: Frontend served from Vercel's CDN
- **Database**: Use connection pooling for PostgreSQL
- **Caching**: API responses cached where appropriate

---

Your My Budget Mate application is now ready for production deployment on Vercel with full GitHub integration! 🚀