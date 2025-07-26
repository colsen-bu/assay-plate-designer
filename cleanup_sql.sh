#!/bin/bash

# Cleanup Script for SQL Files Consolidation
# This script helps organize the SQL files after consolidation

echo "🧹 SQL Files Consolidation Cleanup"
echo "=================================="

# Create backup directory
echo "📁 Creating backup directory..."
mkdir -p sql_backup

# Move old SQL files to backup
echo "📦 Moving old SQL files to backup..."
mv schema.sql sql_backup/ 2>/dev/null || echo "schema.sql not found"
mv migration.sql sql_backup/ 2>/dev/null || echo "migration.sql not found"
mv schema_with_segregation.sql sql_backup/ 2>/dev/null || echo "schema_with_segregation.sql not found"
mv simple_schema.sql sql_backup/ 2>/dev/null || echo "simple_schema.sql not found"
mv user_compounds_schema.sql sql_backup/ 2>/dev/null || echo "user_compounds_schema.sql not found"
mv recreate_database.sql sql_backup/ 2>/dev/null || echo "recreate_database.sql not found"

echo "✅ Cleanup complete!"
echo ""
echo "📋 Summary:"
echo "- Old SQL files moved to sql_backup/ directory"
echo "- Production schema: init-scripts/consolidated_schema.sql"
echo "- Docker Compose will use the consolidated schema for initialization"
echo ""
echo "🗑️  To permanently delete old files (after testing):"
echo "rm -rf sql_backup/"
echo ""
echo "📚 Next steps:"
echo "1. Review PRODUCTION_DEPLOYMENT.md for deployment instructions"
echo "2. Copy .env.production.template to .env.production and configure"
echo "3. Run: docker-compose up -d"
