# Vercel Postgres Production Setup

## 🚀 Quick Deployment Guide

### 1. Remove Static Export
✅ **Done**: Removed `output: 'export'` from `next.config.ts`

### 2. Install Dependencies
✅ **Done**: Added `@vercel/postgres`

### 3. Deploy to Vercel

1. **Connect to Vercel**:
   ```bash
   # Install Vercel CLI if you haven't already
   npm i -g vercel
   
   # Deploy your project
   vercel
   ```

2. **Add Vercel Postgres**:
   - Go to your Vercel dashboard
   - Select your project
   - Go to "Storage" tab
   - Click "Create Database" → "Postgres"
   - Follow the setup wizard

3. **Initialize Database**:
   - Copy your database URL from Vercel dashboard
   - Run the schema setup:
   ```bash
   # Method 1: Using environment variable (load .env first)
   export $(grep -v '^#' .env | xargs) && psql $DATABASE_URL -f schema.sql
   
   # Method 2: Direct URL (replace with your actual URL)
   psql "your-postgres-url-here" -f schema.sql
   
   # If you have existing data, run migration first:
   psql "your-postgres-url-here" -f migration.sql
   ```

### 4. Environment Variables
Vercel automatically sets these when you add Postgres:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL` 
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

## 🏗️ Architecture Overview

### Database Schema
```sql
projects (id, name, description, created_at, last_modified)
plates (id, project_id, name, plate_type, description, created_by, created_at, last_modified, tags[], status, wells)
```

### API Routes
- `GET/POST /api/projects` - List/create projects
- `GET/PUT/DELETE /api/projects/[id]` - Individual project operations
- `GET/POST /api/projects/[id]/plates` - Plates within a project
- `GET/PUT/DELETE /api/plates/[plateId]` - Individual plate operations
- `POST /api/plates/[plateId]/duplicate` - Duplicate a plate

### Components
- **AssayPlateManager** - Main component using `apiDataService`
- **AssayPlateDesigner** - Your existing plate editor (embedded unchanged)
- **Database Layer** - `src/lib/database.ts` with type-safe Postgres operations
- **API Service** - `src/lib/apiDataService.ts` for frontend-backend communication

## 🔧 Local Development

1. **Get database credentials** from Vercel dashboard
2. **Create `.env.local`**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual database credentials
   ```
3. **Run development server**:
   ```bash
   npm run dev
   ```

## 📝 Features

✅ **Working Features**:
- Create/view/delete projects
- Create/view/delete/duplicate plates  
- Real-time database persistence
- Type-safe API layer
- Error handling and loading states
- Embedded plate editor

🚧 **Ready for Enhancement**:
- User authentication (add Vercel Auth)
- Real-time collaboration (add WebSockets)
- File uploads (add Vercel Blob)
- Advanced search and filtering
- Email notifications
- Data export options

## 🛡️ Security Notes

- Database credentials auto-managed by Vercel
- API routes validate input data
- SQL injection protection via parameterized queries
- Ready for authentication integration

## 📊 Monitoring

Vercel provides built-in:
- Database performance metrics
- API route analytics  
- Error tracking
- Function logs

## 🔄 Database Migrations

For schema changes:
1. Update `schema.sql`
2. Create migration script in `migrations/` folder
3. Run against production database during deployment

## 💡 Pro Tips

1. **Use Vercel CLI** for easy database management:
   ```bash
   vercel env pull .env.local  # Sync environment variables
   ```

2. **Database Connection Pooling** is handled automatically

3. **Preview Deployments** get separate database instances

4. **Monitor Usage** in Vercel dashboard to optimize costs

---

Your assay plate manager is now production-ready with a robust Postgres backend! 🎉
