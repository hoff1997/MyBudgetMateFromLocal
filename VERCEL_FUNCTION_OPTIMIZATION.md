# Vercel Function Optimization

## Issue: Serverless Function Limit
Vercel Hobby plan allows maximum 12 serverless functions, but we have 13+ API endpoints.

## Solution: Consolidated API Structure
Reduced from 13+ endpoints to 6 core functions:

### Core API Functions (6 total)
1. **api/ping.ts** - Health check
2. **api/auth/login.ts** - Authentication endpoint  
3. **api/auth/user.ts** - User information
4. **api/accounts.ts** - Account management
5. **api/envelopes.ts** - Envelope operations
6. **api/transactions.ts** - Transaction handling

### Excluded Functions
- Removed supabase/* endpoints (3 functions)
- Removed accounts/index.ts, envelopes/index.ts, transactions/index.ts (3 functions)
- Removed test.ts (1 function)

## Alternative: Simple Redirect Strategy
Even simpler option - use only 1 function for a redirect page:

```json
{
  "buildCommand": "mkdir -p dist/public && echo '<h1>My Budget Mate</h1><p>Use Replit: <a href=\"https://mybudgetmate.replit.app\">mybudgetmate.replit.app</a></p>' > dist/public/index.html",
  "outputDirectory": "dist/public"
}
```

## Recommendation
Use Replit as primary platform since:
- No function limits
- Complete feature set working
- Built-in database and authentication
- Better suited for this application architecture

**Primary URL**: https://mybudgetmate.replit.app/