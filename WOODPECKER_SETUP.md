# Woodpecker CI/CD Secrets Configuration

## Overview
This document outlines the secrets that need to be configured in your Woodpecker CI/CD instance for the automated deployment pipeline.

## Required Secrets

### Production Environment
- **postgres_password**: PostgreSQL database password for production
- **clerk_secret_key**: Clerk secret key from your Clerk dashboard
- **clerk_publishable_key**: Clerk publishable key from your Clerk dashboard

### Staging Environment (Optional)
- **staging_postgres_password**: PostgreSQL password for staging
- **staging_clerk_secret_key**: Clerk secret key for staging environment
- **staging_clerk_publishable_key**: Clerk publishable key for staging

### Notification (Optional)
- **slack_webhook**: Slack webhook URL for deployment notifications

## Setting Up Secrets in Woodpecker

### Via Woodpecker CLI
```bash
# Production secrets
woodpecker-cli secret add --repository your-org/assay-plate-designer --name postgres_password --value "your_secure_password"
woodpecker-cli secret add --repository your-org/assay-plate-designer --name clerk_secret_key --value "sk_live_..."
woodpecker-cli secret add --repository your-org/assay-plate-designer --name clerk_publishable_key --value "pk_live_..."

# Staging secrets (if using staging)
woodpecker-cli secret add --repository your-org/assay-plate-designer --name staging_postgres_password --value "staging_password"
woodpecker-cli secret add --repository your-org/assay-plate-designer --name staging_clerk_secret_key --value "sk_test_..."
woodpecker-cli secret add --repository your-org/assay-plate-designer --name staging_clerk_publishable_key --value "pk_test_..."

# Notification
woodpecker-cli secret add --repository your-org/assay-plate-designer --name slack_webhook --value "https://hooks.slack.com/..."
```

### Via Woodpecker Web UI
1. Navigate to your repository in Woodpecker
2. Go to Settings → Secrets
3. Add each secret with the appropriate name and value
4. Ensure secrets are marked as "Pull Request" if needed for PR builds

## Pipeline Features

### Automated Testing
- ✅ Runs on every push and pull request
- ✅ Installs dependencies with `npm ci`
- ✅ Runs linting with `npm run lint`
- ✅ Builds application with `npm run build`
- ✅ Type checking with `npm run type-check`

### Docker Build & Deploy
- ✅ Builds Docker images with commit SHA tags
- ✅ Deploys to production (main branch)
- ✅ Deploys to staging (deployment branch)
- ✅ Health checks after deployment
- ✅ Automatic cleanup of old images

### Security & Monitoring
- ✅ Security scanning with Trivy
- ✅ Database backups (daily cron job)
- ✅ Deployment notifications
- ✅ PR cleanup on close

### Branch Strategy
- **main**: Production deployments
- **deployment**: Staging deployments
- **feature branches**: Testing only (via PRs)

## Customization Options

### Backup Configuration
Edit the backup step in `.woodpecker.yml` to match your backup solution:
```yaml
# Example for S3 backup
- aws s3 cp /tmp/$BACKUP_FILE s3://your-backup-bucket/backups/

# Example for FTP backup
- curl -T /tmp/$BACKUP_FILE ftp://backup-server/backups/

# Example for rsync backup
- rsync /tmp/$BACKUP_FILE user@backup-server:/backups/
```

### Notification Configuration
Update the notify step for your preferred notification service:
```yaml
# Slack
- curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"$STATUS: Deployment completed\"}" \
    $SLACK_WEBHOOK_URL

# Discord
- curl -X POST -H 'Content-type: application/json' \
    --data "{\"content\":\"$STATUS: Deployment completed\"}" \
    $DISCORD_WEBHOOK_URL

# Email (using sendmail)
- echo "$STATUS: Deployment completed" | mail -s "Deployment Status" admin@yourdomain.com
```

## Troubleshooting

### Common Issues

1. **Secret not found**: Ensure secrets are properly configured in Woodpecker
2. **Docker permission denied**: Verify Docker socket is mounted correctly
3. **Health check failures**: Check application logs and database connectivity
4. **Build failures**: Review test output and dependency issues

### Debug Commands
```bash
# Check Woodpecker agent logs
docker logs woodpecker-agent

# View pipeline logs
woodpecker-cli pipeline logs your-org/assay-plate-designer main

# Test Docker build locally
docker build -t test-build .
```

## Security Best Practices

1. **Rotate Secrets Regularly**: Update passwords and keys periodically
2. **Limit Secret Access**: Only grant access to necessary pipelines
3. **Use Environment-Specific Secrets**: Separate production and staging secrets
4. **Monitor Pipeline Activity**: Review deployment logs regularly
5. **Backup Strategy**: Ensure database backups are stored securely

## Next Steps

1. Configure secrets in your Woodpecker instance
2. Push to the `deployment` branch to test staging deployment
3. Merge to `main` to trigger production deployment
4. Set up monitoring and alerting for your deployed application
5. Configure backup storage solution
6. Test disaster recovery procedures
