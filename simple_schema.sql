-- Create projects table (without created_by for now)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_modified TIMESTAMP DEFAULT NOW()
);

-- Create plates table (without created_by for now)
CREATE TABLE IF NOT EXISTS plates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  plate_type INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_modified TIMESTAMP DEFAULT NOW(),
  tags JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'draft',
  wells JSONB DEFAULT '{}'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_plates_project_id ON plates(project_id);
CREATE INDEX IF NOT EXISTS idx_plates_status ON plates(status);
CREATE INDEX IF NOT EXISTS idx_plates_created_at ON plates(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
