# Nginx Proxy Manager Configuration Guide for Assay Plate Designer
# This guide shows how to configure NPM through the web interface

## Nginx Proxy Manager Setup Guide

### 1. Production Proxy Host Configuration

**Access NPM Web Interface**: http://your-npm-server:81

**Create New Proxy Host**:
- **Domain Names**: `plates.yourdomain.com`
- **Scheme**: `http`
- **Forward Hostname/IP**: `your-server-ip` (or `host.docker.internal` if NPM is in Docker)
- **Forward Port**: `3687`
- **Cache Assets**: ✅ Enabled
- **Block Common Exploits**: ✅ Enabled
- **Websockets Support**: ✅ Enabled

**SSL Tab**:
- **SSL Certificate**: Request a new SSL Certificate
- **Force SSL**: ✅ Enabled
- **HTTP/2 Support**: ✅ Enabled
- **HSTS Enabled**: ✅ Enabled

**Advanced Tab** (Custom Nginx Configuration):
```nginx
# Health check endpoint (no access logging)
location /api/health {
    proxy_pass http://your-server-ip:3687/api/health;
    access_log off;
}

# Cache static assets
location /_next/static/ {
    proxy_pass http://your-server-ip:3687;
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
}

# Security headers
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Rate limiting for API endpoints
location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://your-server-ip:3687;
}
```

### 2. Staging Proxy Host Configuration (Optional)

**Create Second Proxy Host**:
- **Domain Names**: `staging-plates.yourdomain.com`
- **Forward Port**: `3688` (staging runs on different port)
- **SSL Certificate**: Request new certificate for staging subdomain

**Advanced Tab** (Basic Auth for Staging):
```nginx
# Basic authentication for staging
auth_basic "Staging Environment";
auth_basic_user_file /data/nginx/htpasswd;

# Health check
location /api/health {
    proxy_pass http://your-server-ip:3688/api/health;
    access_log off;
}
```

### 3. Rate Limiting Configuration

**In NPM Advanced Settings** (Global):
```nginx
# Add to Custom Nginx Configuration (top level)
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
}
```

### 4. Access Lists (Optional Security)

**Create Access List**:
- **Name**: `Office Network Only`
- **Satisfy**: `All`
- **Authorization Rules**:
  - **Type**: `Allow`
  - **Address**: `your-office-ip/32`
  - **Type**: `Deny`
  - **Address**: `0.0.0.0/0`

**Apply to Proxy Host**: Select the access list in your proxy host configuration

## NPM vs Manual Nginx Benefits

✅ **Web Interface**: Easy configuration without editing files
✅ **SSL Management**: Automatic Let's Encrypt certificate handling
✅ **Docker Integration**: Works seamlessly with containerized apps
✅ **Access Lists**: Built-in IP-based access control
✅ **Real-time Logs**: Built-in log viewing
✅ **Backup/Restore**: Configuration backup through web interface

## Quick Setup Commands

### 1. Start Your Application
```bash
# Configure environment
cp .env.production.template .env.production
# Edit .env.production with your values

# Start services
docker-compose up -d
```

### 2. Verify Application is Running
```bash
# Check health
curl http://your-server-ip:3687/api/health

# Should return: {"status":"healthy","timestamp":"..."}
```

### 3. Configure NPM
1. Open NPM web interface: `http://your-npm-server:81`
2. Add new Proxy Host with the settings above
3. Test: `https://plates.yourdomain.com/api/health`

### 4. Production Checklist
- ✅ SSL certificate configured and forced
- ✅ Health check endpoint accessible
- ✅ Static assets cached properly
- ✅ Security headers added
- ✅ Rate limiting configured
- ✅ Access logs enabled
- ✅ Basic auth on staging (if used)

## Troubleshooting NPM Issues

### 1. 502 Bad Gateway
```bash
# Check if application is running
docker-compose ps

# Check application logs
docker-compose logs app

# Verify NPM can reach your server
# In NPM container or server:
curl http://your-server-ip:3687/api/health
```

### 2. SSL Certificate Issues
- **Let's Encrypt Failures**: Ensure ports 80/443 are open and domain points to server
- **Certificate Renewal**: NPM handles automatic renewal
- **Mixed Content**: Ensure all resources use HTTPS

### 3. Performance Issues
```nginx
# Add to NPM Advanced Configuration
proxy_buffering on;
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;

# Connection timeouts
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

## Integration with Woodpecker CI/CD

Your Woodpecker pipeline will deploy to the same ports that NPM proxies:
- **Production**: `localhost:3687` → `https://plates.yourdomain.com`
- **Staging**: `localhost:3688` → `https://staging-plates.yourdomain.com`

No changes needed to NPM configuration when Woodpecker redeploys containers.