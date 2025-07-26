-- Migration to add created_by columns to existing tables
-- This migration adds the missing created_by columns that are expected by the application

-- Add created_by column to projects table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='projects' AND column_name='created_by') THEN
        ALTER TABLE projects ADD COLUMN created_by VARCHAR(255) NOT NULL DEFAULT 'migrated_user';
    END IF;
END $$;

-- Add created_by column to plates table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='plates' AND column_name='created_by') THEN
        ALTER TABLE plates ADD COLUMN created_by VARCHAR(255) NOT NULL DEFAULT 'migrated_user';
    END IF;
END $$;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_plates_created_by ON plates(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

-- Add tables for user compounds and cell types
CREATE TABLE IF NOT EXISTS user_compounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  compound_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used TIMESTAMP DEFAULT NOW(),
  use_count INTEGER DEFAULT 1,
  UNIQUE(user_id, compound_name)
);

CREATE TABLE IF NOT EXISTS user_cell_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  cell_type_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used TIMESTAMP DEFAULT NOW(),
  use_count INTEGER DEFAULT 1,
  UNIQUE(user_id, cell_type_name)
);

-- Create indexes for user compounds and cell types
CREATE INDEX IF NOT EXISTS idx_user_compounds_user_id ON user_compounds(user_id);
CREATE INDEX IF NOT EXISTS idx_user_compounds_last_used ON user_compounds(last_used DESC);
CREATE INDEX IF NOT EXISTS idx_user_compounds_use_count ON user_compounds(use_count DESC);

CREATE INDEX IF NOT EXISTS idx_user_cell_types_user_id ON user_cell_types(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cell_types_last_used ON user_cell_types(last_used DESC);
CREATE INDEX IF NOT EXISTS idx_user_cell_types_use_count ON user_cell_types(use_count DESC);

-- Add plate templates table
CREATE TABLE IF NOT EXISTS plate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  plate_type INTEGER NOT NULL,
  template_wells JSONB DEFAULT '{}',
  dosing_parameters JSONB DEFAULT '{}',
  control_configuration JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  last_modified TIMESTAMP DEFAULT NOW(),
  use_count INTEGER DEFAULT 0
);

-- Create indexes for plate templates
CREATE INDEX IF NOT EXISTS idx_plate_templates_user_id ON plate_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_plate_templates_created_at ON plate_templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plate_templates_use_count ON plate_templates(use_count DESC);

-- Optional: Update existing records with actual user IDs if you have that information
-- UPDATE projects SET created_by = 'your_actual_user_id' WHERE created_by = 'migrated_user';
-- UPDATE plates SET created_by = 'your_actual_user_id' WHERE created_by = 'migrated_user';