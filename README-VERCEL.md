# My Budget Mate - Vercel Deployment Guide

## Overview
This comprehensive budgeting application is fully configured for Vercel deployment via GitHub with serverless functions and authentication.

## Quick Deploy to Vercel

### 1. Prerequisites
- GitHub account
- Vercel account (connect to GitHub)
- PostgreSQL database (Supabase recommended)

### 2. One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/hoff1997/MyBudgetMate3.git)

### 3. Environment Variables Setup
Configure these in Vercel dashboard:

```bash
# Required
JWT_SECRET=your-super-secure-jwt-secret-here
STORAGE_TYPE=memory

# Optional - Database (for production)
DATABASE_URL=postgresql://username:password@hostname:port/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Optional - Bank Integration
AKAHU_BASE_URL=https://api.akahu.io
AKAHU_APP_TOKEN=your-akahu-app-token
AKAHU_USER_TOKEN=your-akahu-user-token
```

### 4. Demo Access
After deployment, use these credentials:
- **Username**: demo
- **Password**: mybudgetmate, demo123, or budgetmate

## Features Available on Vercel

✅ **Core Budgeting**
- Envelope-based budgeting system
- Transaction management and approval
- Account balance tracking
- Real-time balance calculations

✅ **User Interface**
- Responsive mobile-first design
- Dashboard with financial overview
- Transaction reconciliation center
- Envelope planning and management

✅ **Authentication**
- JWT-based secure authentication
- Demo account system
- Session management

✅ **API Endpoints**
- `/api/auth/login` - User authentication
- `/api/auth/user` - User profile
- `/api/envelopes` - Envelope CRUD operations
- `/api/transactions` - Transaction management
- `/api/accounts` - Account management

## Architecture

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** + shadcn/ui components
- **TanStack Query** for state management
- **Wouter** for client-side routing

### Backend
- **Vercel Serverless Functions** (Node.js 18)
- **JWT Authentication** with secure token storage
- **PostgreSQL** database support (Supabase compatible)
- **In-memory storage** fallback for demo

### Deployment Structure
```
api/
├── auth/
│   ├── login.ts      # Authentication endpoint
│   └── user.ts       # User profile endpoint
├── accounts.ts       # Account management
├── envelopes.ts      # Envelope operations
└── transactions.ts   # Transaction handling

client/
├── src/
│   ├── lib/vercel-auth.ts     # Authentication utilities
│   ├── hooks/useVercelAuth.ts # Auth React hook
│   └── ... (existing components)
```

## Build Configuration
- **Frontend Build**: `vite build`
- **Output Directory**: `dist/public`
- **Node Runtime**: 18.x
- **Function Regions**: Auto (global)

## Database Options

### Option 1: Memory Storage (Default)
- No database required
- Perfect for demos and testing
- Data resets between deployments

### Option 2: Supabase (Recommended)
```bash
STORAGE_TYPE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
```

### Option 3: PostgreSQL
```bash
STORAGE_TYPE=postgres
DATABASE_URL=postgresql://username:password@hostname:port/database
```

## Post-Deployment

1. **Test Authentication**
   - Visit your Vercel URL
   - Login with demo credentials
   - Verify dashboard loads correctly

2. **Configure Domain** (Optional)
   - Add custom domain in Vercel dashboard
   - Update any hardcoded URLs if needed

3. **Monitor Performance**
   - Check Vercel Analytics
   - Monitor function execution times
   - Review error logs

## Troubleshooting

### Common Issues

**Authentication Errors**
- Verify JWT_SECRET is set in environment variables
- Check browser localStorage for auth_token

**Database Connection Issues**
- Verify DATABASE_URL format
- Test database connectivity
- Check Supabase project settings

**Function Timeouts**
- Vercel functions have 10s timeout on hobby plan
- Optimize database queries for speed
- Consider upgrading to Pro plan for 60s timeout

### Support
- GitHub Issues: Report bugs and feature requests
- Documentation: Full API documentation in `/docs`
- Demo: Live demo at your-deployment.vercel.app

## Security Features

- JWT token authentication
- Secure password handling
- Environment variable protection
- HTTPS enforcement
- CORS configuration
- Input validation and sanitization

## Performance Optimizations

- Static asset optimization with Vite
- Serverless function cold start minimization
- Database connection pooling
- Client-side caching with TanStack Query
- Image optimization for receipts
- Code splitting and lazy loading

---

**Ready for Production**: This configuration provides a complete, scalable budgeting application ready for real-world use on Vercel's global infrastructure.