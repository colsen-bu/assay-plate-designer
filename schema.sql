-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
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
  created_by VARCHAR(255),
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

-- Insert sample data
INSERT INTO projects (id, name, description, created_at, last_modified) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Drug Screening Study', 'Screening potential compounds for anti-cancer activity', '2024-01-01', '2024-01-15'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Toxicity Testing', 'Evaluating compound toxicity profiles', '2024-02-01', '2024-02-10')
ON CONFLICT (id) DO NOTHING;

INSERT INTO plates (id, project_id, name, plate_type, description, created_by, created_at, last_modified, tags, status, wells) VALUES
  ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Compound Screen 1', 96, 'Initial compound screening', 'Dr. Smith', '2024-01-01', '2024-01-05', '["screening", "compounds"]', 'active', '{}'),
  ('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'Dose Response 1', 384, 'Dose response for top hits', 'Dr. Johnson', '2024-01-10', '2024-01-15', '["dose-response", "validation"]', 'draft', '{}')
ON CONFLICT (id) DO NOTHING;
