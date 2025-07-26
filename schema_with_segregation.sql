-- Updated schema with user segregation
-- Drop existing tables to start fresh
DROP TABLE IF EXISTS plates CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- Create projects table with user segregation
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by VARCHAR(255) NOT NULL, -- Clerk user ID
  created_at TIMESTAMP DEFAULT NOW(),
  last_modified TIMESTAMP DEFAULT NOW()
);

-- Create plates table with user segregation
CREATE TABLE plates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  plate_type INTEGER NOT NULL,
  description TEXT,
  created_by VARCHAR(255) NOT NULL, -- Clerk user ID
  created_at TIMESTAMP DEFAULT NOW(),
  last_modified TIMESTAMP DEFAULT NOW(),
  tags JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'draft',
  wells JSONB DEFAULT '{}'
);

-- Create indexes for better performance and user segregation
CREATE INDEX idx_plates_project_id ON plates(project_id);
CREATE INDEX idx_plates_status ON plates(status);
CREATE INDEX idx_plates_created_at ON plates(created_at);
CREATE INDEX idx_plates_created_by ON plates(created_by);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_created_by ON projects(created_by);

-- Add some sample data for testing
INSERT INTO projects (name, description, created_by) VALUES 
('Test Project 1', 'First test project with segregation', 'user_test_1'),
('Test Project 2', 'Second test project with segregation', 'user_test_2');

-- Add sample plates
INSERT INTO plates (project_id, name, plate_type, description, created_by, status) 
SELECT 
  p.id,
  'Test Plate ' || (ROW_NUMBER() OVER()),
  96,
  'Test plate for project ' || p.name,
  p.created_by,
  CASE 
    WHEN ROW_NUMBER() OVER() % 4 = 1 THEN 'draft'
    WHEN ROW_NUMBER() OVER() % 4 = 2 THEN 'active'
    WHEN ROW_NUMBER() OVER() % 4 = 3 THEN 'completed'
    ELSE 'archived'
  END
FROM projects p
CROSS JOIN generate_series(1, 3) AS gs(n);
