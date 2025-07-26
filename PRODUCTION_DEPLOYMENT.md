# Production Deployment Guide

## Overview
This guide will help you deploy the Assay Plate Designer application to your OCI setup using Docker Compose with a self-hosted PostgreSQL database.

## Files Created
- `init-scripts/consolidated_schema.sql` - Complete database schema with all features
- `docker-compose.yml` - Container orchestration configuration
- `Dockerfile` - Production-optimized container build
- `.env.production.template` - Environment variables template
- `src/app/api/health/route.ts` - Health check endpoint
- Updated `next.config.ts` - Standalone build configuration

## Pre-Deployment Steps

### 1. Environment Configuration
```bash
# Copy the environment template
cp .env.production.template .env.production

# Edit the file with your actual values
nano .env.production
```

Required environment variables:
- `POSTGRES_PASSWORD` - Secure password for PostgreSQL
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `NEXTAUTH_URL` - Your domain (e.g., https://plates.yourdomain.com)
- `CLERK_SECRET_KEY` - From your Clerk dashboard
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - From your Clerk dashboard

### 2. Nginx Configuration
Add this to your existing Nginx configuration:

```nginx
# Assay Plate Designer upstream
upstream assay_plate_designer {
    server 127.0.0.1:3000;
}

# Server block for your domain
server {
    listen 443 ssl http2;
    server_name plates.yourdomain.com;  # Change to your domain
    
    # SSL configuration (use your existing SSL setup)
    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;
    
    # Proxy to the Docker container
    location / {
        proxy_pass http://assay_plate_designer;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /api/health {
        proxy_pass http://assay_plate_designer/api/health;
        access_log off;
    }
}
```

## Deployment Commands

### 1. Build and Start Services
```bash
# Build the application image
docker-compose build

# Start services in detached mode
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f app
docker-compose logs -f postgres
```

### 2. Verify Deployment
```bash
# Check health endpoint
curl http://localhost:3000/api/health

# Check database connectivity
docker-compose exec postgres psql -U postgres -d assay_plate_designer -c "\\dt"
```

## Data Migration from Neon

### 1. Export Data from Neon
```bash
# Export your current data (replace with your Neon connection string)
pg_dump "your_neon_connection_string" > neon_data_export.sql
```

### 2. Import Data to Local PostgreSQL
```bash
# Wait for services to be ready
docker-compose up -d
sleep 30

# Import data (this will add to the schema created by init-scripts)
docker-compose exec -T postgres psql -U postgres -d assay_plate_designer < neon_data_export.sql
```

## Backup Strategy

### 1. Automated Backups
Create a backup script (`backup.sh`):
```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T postgres pg_dump -U postgres assay_plate_designer > "$BACKUP_DIR/backup_$DATE.sql"
# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "backup_*.sql" -mtime +30 -delete
```

### 2. Volume Backups
```bash
# Backup PostgreSQL data volume
docker run --rm -v assay-plate-designer_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_data_backup.tar.gz -C /data .
```

## Maintenance Commands

### Update Application
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose build app
docker-compose up -d app
```

### Database Maintenance
```bash
# Connect to database
docker-compose exec postgres psql -U postgres -d assay_plate_designer

# View running processes
docker-compose exec postgres psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# Backup database
docker-compose exec postgres pg_dump -U postgres assay_plate_designer > backup.sql
```

### Monitoring
```bash
# Monitor resource usage
docker stats

# View application logs
docker-compose logs -f --tail=100 app

# Monitor database logs
docker-compose logs -f --tail=100 postgres
```

## Troubleshooting

### Common Issues

1. **Container won't start**: Check logs with `docker-compose logs app`
2. **Database connection failed**: Verify `DATABASE_URL` in `.env.production`
3. **Clerk authentication issues**: Verify Clerk keys and URLs
4. **Build failures**: Clear Docker cache with `docker system prune -a`

### Useful Commands
```bash
# Restart all services
docker-compose restart

# Stop all services
docker-compose down

# Remove everything including volumes (WARNING: DATA LOSS)
docker-compose down -v

# Shell into running container
docker-compose exec app sh
docker-compose exec postgres psql -U postgres -d assay_plate_designer
```

## Security Considerations

1. **Environment Variables**: Never commit `.env.production` to git
2. **Database Password**: Use a strong password (generate with `openssl rand -base64 32`)
3. **Firewall**: Only expose port 3000 to localhost (Nginx will proxy)
4. **Updates**: Regularly update Docker images and dependencies
5. **Backups**: Store backups in a separate location from the server

## Performance Tuning

### PostgreSQL Optimization
Add to your `docker-compose.yml` under postgres service:
```yaml
command: postgres -c shared_preload_libraries=pg_stat_statements -c pg_stat_statements.track=all -c max_connections=200
```

### Application Optimization
The Dockerfile is already optimized with:
- Multi-stage builds for smaller image size
- Standalone output for faster starts
- Health checks for reliability
- Non-root user for security
