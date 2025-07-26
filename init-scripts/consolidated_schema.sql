-- Consolidated Production Schema for Assay Plate Designer
-- This schema combines all features from multiple SQL files into one production-ready database
-- Includes: Core tables, user segregation, templates, compounds, cell types, and all indexes

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================================================
-- CORE TABLES: Projects and Plates
-- ===================================================================

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_modified TIMESTAMP DEFAULT NOW()
);

-- Create plates table
CREATE TABLE IF NOT EXISTS plates (
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

-- ===================================================================
-- TEMPLATE SYSTEM
-- ===================================================================

-- Create templates table for reusable plate configurations
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  plate_type INTEGER NOT NULL,
  wells JSONB DEFAULT '{}',
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_modified TIMESTAMP DEFAULT NOW(),
  tags JSONB DEFAULT '[]'
);

-- ===================================================================
-- COMPOUND AND CELL TYPE MANAGEMENT
-- ===================================================================

-- Create compounds table for managing compound library
CREATE TABLE IF NOT EXISTS compounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  cas_number VARCHAR(50),
  molecular_weight NUMERIC(10,4),
  smiles TEXT,
  description TEXT,
  supplier VARCHAR(255),
  catalog_number VARCHAR(100),
  purity NUMERIC(5,2),
  solubility_dmso NUMERIC(10,4),
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_modified TIMESTAMP DEFAULT NOW(),
  tags JSONB DEFAULT '[]'
);

-- Create cell_types table for managing cell line information
CREATE TABLE IF NOT EXISTS cell_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  organism VARCHAR(255),
  tissue VARCHAR(255),
  cell_line VARCHAR(255),
  growth_medium TEXT,
  passage_conditions TEXT,
  notes TEXT,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_modified TIMESTAMP DEFAULT NOW(),
  tags JSONB DEFAULT '[]'
);

-- ===================================================================
-- USER DATA SEGREGATION
-- ===================================================================

-- Create user_compounds table for user-specific compound collections
CREATE TABLE IF NOT EXISTS user_compounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  compound_id UUID REFERENCES compounds(id) ON DELETE CASCADE,
  personal_notes TEXT,
  concentration NUMERIC(10,6),
  concentration_unit VARCHAR(20) DEFAULT 'mM',
  stock_location VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  last_modified TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, compound_id)
);

-- Create user_cell_types table for user-specific cell type collections
CREATE TABLE IF NOT EXISTS user_cell_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  cell_type_id UUID REFERENCES cell_types(id) ON DELETE CASCADE,
  personal_notes TEXT,
  passage_number INTEGER,
  culture_date DATE,
  viability NUMERIC(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  last_modified TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, cell_type_id)
);

-- ===================================================================
-- PERFORMANCE INDEXES
-- ===================================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_plates_project_id ON plates(project_id);
CREATE INDEX IF NOT EXISTS idx_plates_status ON plates(status);
CREATE INDEX IF NOT EXISTS idx_plates_created_at ON plates(created_at);
CREATE INDEX IF NOT EXISTS idx_plates_created_by ON plates(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

-- Template indexes
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON templates(created_by);
CREATE INDEX IF NOT EXISTS idx_templates_plate_type ON templates(plate_type);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at);

-- Compound and cell type indexes
CREATE INDEX IF NOT EXISTS idx_compounds_created_by ON compounds(created_by);
CREATE INDEX IF NOT EXISTS idx_compounds_name ON compounds(name);
CREATE INDEX IF NOT EXISTS idx_compounds_cas_number ON compounds(cas_number);
CREATE INDEX IF NOT EXISTS idx_cell_types_created_by ON cell_types(created_by);
CREATE INDEX IF NOT EXISTS idx_cell_types_name ON cell_types(name);

-- User segregation indexes
CREATE INDEX IF NOT EXISTS idx_user_compounds_user_id ON user_compounds(user_id);
CREATE INDEX IF NOT EXISTS idx_user_compounds_compound_id ON user_compounds(compound_id);
CREATE INDEX IF NOT EXISTS idx_user_cell_types_user_id ON user_cell_types(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cell_types_cell_type_id ON user_cell_types(cell_type_id);

-- ===================================================================
-- JSONB INDEXES FOR PERFORMANCE
-- ===================================================================

-- Indexes for JSONB columns to improve query performance
CREATE INDEX IF NOT EXISTS idx_plates_tags_gin ON plates USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_plates_wells_gin ON plates USING GIN (wells);
CREATE INDEX IF NOT EXISTS idx_templates_tags_gin ON templates USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_templates_wells_gin ON templates USING GIN (wells);
CREATE INDEX IF NOT EXISTS idx_compounds_tags_gin ON compounds USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_cell_types_tags_gin ON cell_types USING GIN (tags);

-- ===================================================================
-- INITIAL SETUP COMPLETE
-- ===================================================================

-- Note: This schema includes all features from:
-- - schema.sql (core projects/plates)
-- - migration.sql (templates, compounds, cell types, user segregation)
-- - user_compounds_schema.sql (compound/cell type management)
-- - Optimized with comprehensive indexing for production performance
