# My Budget Mate

A comprehensive personal finance management platform that empowers users with intelligent, engaging financial tracking and envelope budgeting through innovative user experience design.

## 🚀 Live Deployments

- **Production (Vercel)**: [Deploy to Vercel](https://vercel.com/new/clone?repository-url=https://github.com/hoff1997/MyBudgetMate)
- **Development (Replit)**: [Open in Replit](https://replit.com/@hoff1997/MyBudgetMate)

## ✨ Features

### 💰 Complete Envelope Budgeting System
- **36 pre-configured envelopes** across 7 categories (Income, Essential Expenses, Lifestyle, Personal Care, Transportation, Utilities, Savings)
- **Zero-based budget planning** with comprehensive setup wizard
- **Real-time balance tracking** and envelope progress indicators
- **Envelope transfer system** for rebalancing funds

### 📊 Transaction Management
- **Smart reconciliation system** with pending transaction workflow
- **CSV bank import** with duplicate detection and validation
- **Transaction splitting** across multiple envelopes
- **Label system** for transaction categorization
- **Receipt upload** with 5MB image support

### 🏦 Banking Integration
- **Akahu API integration** for New Zealand banks (ANZ, ASB, BNZ, Westpac, Kiwibank)
- **Automatic transaction sync** with smart duplicate prevention
- **Bank connection management** with secure OAuth
- **Multiple account support** (checking, savings, credit, investment)

### 📱 Modern User Experience
- **Mobile-responsive design** with dedicated mobile navigation
- **Real-time updates** with React Query integration
- **Drag-and-drop** envelope organization
- **Dark/light theme** support
- **Contextual help tooltips** throughout the interface

### 🔐 Dual Authentication System
- **Replit Auth** for development/demo environments
- **JWT Authentication** for production deployments
- **Secure session management** with proper token handling

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** with shadcn/ui components
- **Wouter** for client-side routing
- **TanStack Query** for server state management
- **React Hook Form** with Zod validation

### Backend
- **Node.js** with Express.js
- **TypeScript** with ES modules
- **Drizzle ORM** for type-safe database operations
- **PostgreSQL** with flexible storage providers

### Database Options
- **Neon Database** (serverless PostgreSQL) for production
- **Supabase** for cloud-hosted PostgreSQL
- **Replit Database** for development environments

## 🚀 Quick Start

### Deploy to Vercel (Recommended)

1. **One-Click Deploy**:
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/hoff1997/MyBudgetMate)

2. **Configure Environment Variables**:
   ```bash
   JWT_SECRET=your-super-secret-jwt-key-here
   DATABASE_URL=your-postgresql-connection-string
   STORAGE_TYPE=supabase  # or 'memory' for demo
   ```

3. **Optional Supabase Setup**:
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```

### Local Development

1. **Clone Repository**:
   ```bash
   git clone https://github.com/hoff1997/MyBudgetMate.git
   cd MyBudgetMate
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Setup Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

5. **Access Application**:
   - Frontend: http://localhost:5000
   - API: http://localhost:5000/api

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `JWT_SECRET` | Secret key for JWT token signing | Yes | - |
| `DATABASE_URL` | PostgreSQL connection string | No | Uses in-memory storage |
| `STORAGE_TYPE` | Storage provider (`supabase`, `memory`) | No | `memory` |
| `SUPABASE_URL` | Supabase project URL | No | - |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | No | - |
| `NODE_ENV` | Environment mode | No | `development` |

### Demo Credentials (Development)

For testing the authentication system:
- Username: `demo` / Password: `mybudgetmate`
- Username: `user` / Password: `demo123`
- Username: `test` / Password: `budgetmate`

## 📱 Mobile Support

Optimized for mobile devices with:
- Touch-friendly interface design
- Responsive breakpoints for all screen sizes
- Mobile-first navigation with bottom tabs
- Optimized transaction reconciliation workflow

## 🌐 Banking Integration (New Zealand)

Supports major NZ banks through Akahu API:
- **ANZ Bank**
- **ASB Bank**
- **Bank of New Zealand (BNZ)**
- **Westpac**
- **Kiwibank**

Requires Akahu developer account and API credentials.

## 🛠️ Development

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run check        # TypeScript type checking
npm run db:push      # Push database schema changes
```

### Tech Stack Details

- **Vite** for fast development and optimized builds
- **ESBuild** for production server bundling
- **Drizzle Kit** for database migrations
- **Express Session** with PostgreSQL store
- **Multer** for file upload handling

## 📊 Project Structure

```
├── client/          # React frontend application
├── server/          # Express backend server
├── shared/          # Shared types and schemas
├── api/            # Vercel serverless functions
├── uploads/        # File upload storage
└── scripts/        # Build and deployment scripts
```

## 🔐 Security Features

- **JWT token authentication** with secure session management
- **CORS protection** with proper headers
- **File upload validation** with size and type restrictions
- **SQL injection prevention** through parameterized queries
- **XSS protection** with proper input sanitization

## 📈 Performance

- **Server-side rendering** with Vite in development
- **Code splitting** and lazy loading for optimal bundle sizes
- **Database connection pooling** for efficient resource usage
- **React Query caching** for minimized API requests
- **Optimized mobile performance** with condensed layouts

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Replit** for development environment and hosting
- **Vercel** for serverless deployment platform
- **shadcn/ui** for beautiful UI components
- **Akahu** for New Zealand banking API integration
- **Supabase** for database and authentication services

---

Built with ❤️ for better personal finance management# Replit-My-Budget-Mate
