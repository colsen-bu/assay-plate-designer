# Database Migration Guide: Neon to Docker PostgreSQL

## Overview
This guide will help you migrate from your current Neon database to a self-hosted PostgreSQL container for production deployment.

## Current Status
✅ **Neon Export Complete**: Your current database has been exported to `neon_export.sql` (14KB)
✅ **Schema Ready**: Consolidated schema created in `init-scripts/consolidated_schema.sql`
✅ **Docker Setup**: PostgreSQL container configured in `docker-compose.yml`

## Migration Options

### Option 1: Fresh Start with New Schema (Recommended)
Best if you want to start with the complete feature set and clean data structure.

```bash
# 1. Set up production environment
cp .env.production.template .env.production
# Edit .env.production with your values

# 2. Generate secure passwords
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)" >> .env.production
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)" >> .env.production

# 3. Start PostgreSQL with clean schema
docker-compose up -d postgres

# 4. Wait for database to initialize (schema auto-loads from init-scripts/)
sleep 30

# 5. Verify schema is loaded
docker-compose exec postgres psql -U postgres -d assay_plate_designer -c "\\dt"

# 6. Start application
docker-compose up -d app
```

### Option 2: Migrate Existing Data
If you have important data in Neon that you want to preserve.

```bash
# 1. Start with fresh database
docker-compose up -d postgres
sleep 30

# 2. Import your existing data (this includes the neon_auth schema)
docker-compose exec -T postgres psql -U postgres -d assay_plate_designer < neon_export.sql

# 3. Run schema updates to add new features
docker-compose exec -T postgres psql -U postgres -d assay_plate_designer < init-scripts/consolidated_schema.sql

# 4. Start application
docker-compose up -d app
```

### Option 3: Hybrid Approach (Data Migration + Clean Schema)
Extract just your application data and migrate to the new schema.

```bash
# 1. Extract only your application tables from Neon
docker run --rm postgres:17-alpine pg_dump \\
  "postgres://neondb_owner:npg_PhUzJi5xB8kG@ep-bitter-king-advbuold-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" \\
  --data-only --table=projects --table=plates > app_data_only.sql

# 2. Start fresh database with new schema
docker-compose up -d postgres
sleep 30

# 3. Import just the application data
docker-compose exec -T postgres psql -U postgres -d assay_plate_designer < app_data_only.sql

# 4. Start application
docker-compose up -d app
```

## Environment Configuration

### 1. Create Production Environment File
```bash
cp .env.production.template .env.production
```

### 2. Configure Required Variables
Edit `.env.production`:

```env
# Database - Use a strong password
POSTGRES_PASSWORD=your_very_secure_password_here
DATABASE_URL=postgresql://postgres:your_very_secure_password_here@postgres:5432/assay_plate_designer

# NextAuth (if using) - Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=https://plates.yourdomain.com

# Clerk - Update with production keys from Clerk dashboard
CLERK_SECRET_KEY=sk_live_your_production_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_production_key
```

### 3. Generate Secure Secrets
```bash
# Generate secure passwords
echo "Generated passwords:"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
```

## Nginx Proxy Manager Configuration

Since you're using Nginx Proxy Manager, configure it through the web UI:

### 1. Production Site
- **Domain Names**: `plates.yourdomain.com`
- **Scheme**: `http`
- **Forward Hostname/IP**: `your-server-ip` or `localhost`
- **Forward Port**: `3000`
- **SSL**: Enable SSL certificate (Let's Encrypt)
- **Advanced**: Add custom location for health checks:
  ```
  location /api/health {
      proxy_pass http://your-server-ip:3000/api/health;
      access_log off;
  }
  ```

### 2. Staging Site (Optional)
- **Domain Names**: `staging-plates.yourdomain.com`
- **Forward Port**: `3001` (for staging deployment)
- **SSL**: Enable SSL certificate

## Verification Steps

### 1. Database Health Check
```bash
# Check if database is running
docker-compose ps postgres

# Connect to database
docker-compose exec postgres psql -U postgres -d assay_plate_designer

# List tables
\\dt

# Check sample data
SELECT COUNT(*) FROM projects;
SELECT COUNT(*) FROM plates;
```

### 2. Application Health Check
```bash
# Check if application is running
docker-compose ps app

# Test health endpoint
curl http://localhost:3000/api/health

# Check application logs
docker-compose logs app
```

### 3. Full System Test
```bash
# Test through Nginx Proxy Manager
curl https://plates.yourdomain.com/api/health

# Check application functionality
open https://plates.yourdomain.com
```

## Backup Strategy

### 1. Automated Backups (via Woodpecker)
The Woodpecker pipeline includes daily backups. Customize the backup step:

```yaml
# In .woodpecker.yml - backup step
- |
  BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
  docker-compose exec -T postgres pg_dump -U postgres assay_plate_designer > "/path/to/backups/$BACKUP_FILE"
  
  # Optional: Upload to cloud storage
  # aws s3 cp "/path/to/backups/$BACKUP_FILE" s3://your-backup-bucket/
```

### 2. Manual Backups
```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres assay_plate_designer > "backup_$(date +%Y%m%d).sql"

# Restore from backup
docker-compose exec -T postgres psql -U postgres -d assay_plate_designer < backup_file.sql
```

## Rollback Plan

If you need to rollback to Neon:

```bash
# 1. Export current Docker database
docker-compose exec postgres pg_dump -U postgres assay_plate_designer > docker_backup.sql

# 2. Update .env to use Neon
# Change DATABASE_URL back to your Neon connection string

# 3. Stop Docker database
docker-compose down

# 4. Deploy application to use Neon again
# Update your deployment to use Neon DATABASE_URL
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check if PostgreSQL is running
   docker-compose logs postgres
   
   # Verify environment variables
   docker-compose exec app printenv | grep DATABASE_URL
   ```

2. **Schema Not Loading**
   ```bash
   # Check init scripts
   ls -la init-scripts/
   
   # Manually run schema
   docker-compose exec -T postgres psql -U postgres -d assay_plate_designer < init-scripts/consolidated_schema.sql
   ```

3. **Permission Issues**
   ```bash
   # Check container logs
   docker-compose logs postgres
   docker-compose logs app
   
   # Reset PostgreSQL data (WARNING: DATA LOSS)
   docker-compose down -v
   docker-compose up -d postgres
   ```

## Next Steps

1. **Choose Migration Option**: Select Option 1, 2, or 3 based on your data needs
2. **Configure Environment**: Set up `.env.production` with secure credentials
3. **Run Migration**: Execute the chosen migration steps
4. **Configure NPM**: Set up reverse proxy through Nginx Proxy Manager UI
5. **Test Deployment**: Verify application functionality
6. **Setup Monitoring**: Configure backup and monitoring systems
7. **Update DNS**: Point your domain to the new server

## Security Considerations

- ✅ Use strong passwords (32+ characters)
- ✅ Enable SSL through Nginx Proxy Manager
- ✅ Restrict database port (5432) to localhost only
- ✅ Regular security updates for Docker images
- ✅ Backup encryption for sensitive data
- ✅ Monitor access logs and failed authentication attempts
