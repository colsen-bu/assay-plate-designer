-- Script to completely recreate the database with the new schema
-- WARNING: This will delete all existing data!

-- Drop existing tables (this will remove all data)
DROP TABLE IF EXISTS plates CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- Recreate with the new schema
-- Create projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_modified TIMESTAMP DEFAULT NOW()
);

-- Create plates table
CREATE TABLE plates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  plate_type INTEGER NOT NULL,
  description TEXT,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_modified TIMESTAMP DEFAULT NOW(),
  tags JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'draft',
  wells JSONB DEFAULT '{}'
);

-- Create indexes for better performance
CREATE INDEX idx_plates_project_id ON plates(project_id);
CREATE INDEX idx_plates_status ON plates(status);
CREATE INDEX idx_plates_created_at ON plates(created_at);
CREATE INDEX idx_plates_created_by ON plates(created_by);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_created_by ON projects(created_by);
