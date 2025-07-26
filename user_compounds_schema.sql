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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_compounds_user_id ON user_compounds(user_id);
CREATE INDEX IF NOT EXISTS idx_user_compounds_last_used ON user_compounds(last_used DESC);
CREATE INDEX IF NOT EXISTS idx_user_compounds_use_count ON user_compounds(use_count DESC);

CREATE INDEX IF NOT EXISTS idx_user_cell_types_user_id ON user_cell_types(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cell_types_last_used ON user_cell_types(last_used DESC);
CREATE INDEX IF NOT EXISTS idx_user_cell_types_use_count ON user_cell_types(use_count DESC);
