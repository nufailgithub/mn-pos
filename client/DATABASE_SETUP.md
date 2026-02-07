# Database Setup Guide

## Quick Start

### Option 1: Local PostgreSQL (Recommended for Development)

1. **Install PostgreSQL** (if not already installed):
   ```bash
   # macOS (using Homebrew)
   brew install postgresql@16
   brew services start postgresql@16
   ```

2. **Create Database**:
   ```bash
   createdb mn_pos_db
   ```

3. **Update .env file** with your connection string:
   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mn_pos_db?schema=public"
   ```

4. **Run Migrations**:
   ```bash
   pnpm db:push
   ```

5. **Generate Prisma Client**:
   ```bash
   pnpm db:generate
   ```

6. **Seed Database** (optional - adds sample data):
   ```bash
   pnpm db:seed
   ```

### Option 2: Cloud PostgreSQL (Neon, Supabase, Railway)

Use a free cloud PostgreSQL database:

- **Neon**: https://neon.tech (Free tier available)
- **Supabase**: https://supabase.com (Free tier available)
- **Railway**: https://railway.app (Free trial available)

Update your `.env` file with the provided connection string.

## Available Database Commands

```bash
# Generate Prisma Client
pnpm db:generate

# Push schema changes to database (for development)
pnpm db:push

# Create and apply migrations (for production)
pnpm db:migrate

# Open Prisma Studio (GUI for your database)
pnpm db:studio

# Seed database with sample data
pnpm db:seed
```

## Database Schema

The POS system includes:

- **Users** - Admin, Manager, Cashier roles
- **Categories** - Product categorization
- **Products** - Inventory management
- **Sales** - Transaction records
- **Sale Items** - Individual items in sales
- **Orders** - Purchase orders for stock
- **Order Items** - Items in purchase orders

## Tech Stack Features

✅ **PostgreSQL** - Reliable, production-ready database
✅ **Prisma ORM** - Type-safe database queries
✅ **TanStack Query** - Efficient data fetching with caching
✅ **Zod Validation** - Schema validation
✅ **Next.js API Routes** - Built-in API endpoints
