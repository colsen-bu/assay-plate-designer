import { sql } from '@vercel/postgres';

export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: Date;
  last_modified: Date;
}

export interface Plate {
  id: string;
  project_id: string;
  name: string;
  plate_type: number;
  description?: string;
  created_by: string;
  created_at: Date;
  last_modified: Date;
  tags: string[];
  status: 'draft' | 'active' | 'completed' | 'archived';
  wells: Record<string, any>;
}

export interface ProjectWithPlates extends Project {
  plates: Plate[];
}

// Project operations
export async function getProjects(): Promise<ProjectWithPlates[]> {
  try {
    // Get all projects
    const { rows: projects } = await sql`
      SELECT * FROM projects 
      ORDER BY created_at DESC
    `;

    // Get all plates for these projects
    const { rows: plates } = await sql`
      SELECT * FROM plates 
      ORDER BY created_at DESC
    `;

    // Group plates by project
    const projectsWithPlates: ProjectWithPlates[] = projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      created_at: new Date(project.created_at),
      last_modified: new Date(project.last_modified),
      plates: plates.filter(plate => plate.project_id === project.id).map(plate => ({
        id: plate.id,
        project_id: plate.project_id,
        name: plate.name,
        plate_type: plate.plate_type,
        description: plate.description,
        created_by: plate.created_by,
        created_at: new Date(plate.created_at),
        last_modified: new Date(plate.last_modified),
        tags: typeof plate.tags === 'string' ? JSON.parse(plate.tags) : (plate.tags || []),
        status: plate.status,
        wells: typeof plate.wells === 'string' ? JSON.parse(plate.wells) : (plate.wells || {})
      }))
    }));

    return projectsWithPlates;
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw new Error('Failed to fetch projects');
  }
}

export async function getProject(id: string): Promise<ProjectWithPlates | null> {
  try {
    const { rows: projects } = await sql`
      SELECT * FROM projects WHERE id = ${id}
    `;

    if (projects.length === 0) {
      return null;
    }

    const { rows: plates } = await sql`
      SELECT * FROM plates WHERE project_id = ${id}
      ORDER BY created_at DESC
    `;

    const project = projects[0];
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      created_at: new Date(project.created_at),
      last_modified: new Date(project.last_modified),
      plates: plates.map(plate => ({
        id: plate.id,
        project_id: plate.project_id,
        name: plate.name,
        plate_type: plate.plate_type,
        description: plate.description,
        created_by: plate.created_by,
        created_at: new Date(plate.created_at),
        last_modified: new Date(plate.last_modified),
        tags: typeof plate.tags === 'string' ? JSON.parse(plate.tags) : (plate.tags || []),
        status: plate.status,
        wells: typeof plate.wells === 'string' ? JSON.parse(plate.wells) : (plate.wells || {})
      }))
    };
  } catch (error) {
    console.error('Error fetching project:', error);
    throw new Error('Failed to fetch project');
  }
}

export async function createProject(data: {
  name: string;
  description?: string;
}): Promise<Project> {
  try {
    const { rows } = await sql`
      INSERT INTO projects (name, description, created_at, last_modified)
      VALUES (${data.name}, ${data.description || null}, NOW(), NOW())
      RETURNING *
    `;

    const project = rows[0];
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      created_at: new Date(project.created_at),
      last_modified: new Date(project.last_modified)
    };
  } catch (error) {
    console.error('Error creating project:', error);
    throw new Error('Failed to create project');
  }
}

export async function updateProject(id: string, data: {
  name?: string;
  description?: string;
}): Promise<Project> {
  try {
    const updates = [];
    const values = [];

    if (data.name !== undefined) {
      updates.push('name = $' + (values.length + 2));
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = $' + (values.length + 2));
      values.push(data.description);
    }

    updates.push('last_modified = NOW()');

    const query = `
      UPDATE projects 
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const { rows } = await sql.query(query, [id, ...values]);

    if (rows.length === 0) {
      throw new Error('Project not found');
    }

    return rows[0];
  } catch (error) {
    console.error('Error updating project:', error);
    throw new Error('Failed to update project');
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    await sql`DELETE FROM projects WHERE id = ${id}`;
  } catch (error) {
    console.error('Error deleting project:', error);
    throw new Error('Failed to delete project');
  }
}

// Plate operations
export async function getPlates(projectId: string): Promise<Plate[]> {
  try {
    const { rows } = await sql`
      SELECT * FROM plates 
      WHERE project_id = ${projectId}
      ORDER BY created_at DESC
    `;

    return rows.map(plate => ({
      id: plate.id,
      project_id: plate.project_id,
      name: plate.name,
      plate_type: plate.plate_type,
      description: plate.description,
      created_by: plate.created_by,
      created_at: new Date(plate.created_at),
      last_modified: new Date(plate.last_modified),
      tags: typeof plate.tags === 'string' ? JSON.parse(plate.tags) : (plate.tags || []),
      status: plate.status,
      wells: typeof plate.wells === 'string' ? JSON.parse(plate.wells) : (plate.wells || {})
    }));
  } catch (error) {
    console.error('Error fetching plates:', error);
    throw new Error('Failed to fetch plates');
  }
}

export async function getPlate(id: string): Promise<Plate | null> {
  try {
    const { rows } = await sql`
      SELECT * FROM plates WHERE id = ${id}
    `;

    if (rows.length === 0) {
      return null;
    }

    const plate = rows[0];
    return {
      id: plate.id,
      project_id: plate.project_id,
      name: plate.name,
      plate_type: plate.plate_type,
      description: plate.description,
      created_by: plate.created_by,
      created_at: new Date(plate.created_at),
      last_modified: new Date(plate.last_modified),
      tags: typeof plate.tags === 'string' ? JSON.parse(plate.tags) : (plate.tags || []),
      status: plate.status,
      wells: typeof plate.wells === 'string' ? JSON.parse(plate.wells) : (plate.wells || {})
    };
  } catch (error) {
    console.error('Error fetching plate:', error);
    throw new Error('Failed to fetch plate');
  }
}

export async function createPlate(data: {
  project_id: string;
  name: string;
  plate_type: number;
  description?: string;
  created_by: string;
  tags?: string[];
  status?: 'draft' | 'active' | 'completed' | 'archived';
}): Promise<Plate> {
  try {
    // Convert tags to JSON string for storage
    const tagsJson = JSON.stringify(data.tags || []);
    
    const { rows } = await sql`
      INSERT INTO plates (
        project_id, name, plate_type, description, created_by, 
        tags, status, created_at, last_modified, wells
      )
      VALUES (
        ${data.project_id}, 
        ${data.name}, 
        ${data.plate_type}, 
        ${data.description || null}, 
        ${data.created_by},
        ${tagsJson}::jsonb,
        ${data.status || 'draft'}, 
        NOW(), 
        NOW(), 
        '{}'::jsonb
      )
      RETURNING *
    `;

    const plate = rows[0];
    return {
      id: plate.id,
      project_id: plate.project_id,
      name: plate.name,
      plate_type: plate.plate_type,
      description: plate.description,
      created_by: plate.created_by,
      created_at: new Date(plate.created_at),
      last_modified: new Date(plate.last_modified),
      tags: typeof plate.tags === 'string' ? JSON.parse(plate.tags) : (plate.tags || []),
      status: plate.status,
      wells: plate.wells || {}
    };
  } catch (error) {
    console.error('Error creating plate:', error);
    throw new Error('Failed to create plate');
  }
}

export async function updatePlate(id: string, data: {
  name?: string;
  description?: string;
  tags?: string[];
  status?: 'draft' | 'active' | 'completed' | 'archived';
  wells?: Record<string, any>;
}): Promise<Plate> {
  try {
    const updates = [];
    const values = [];

    if (data.name !== undefined) {
      updates.push('name = $' + (values.length + 2));
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = $' + (values.length + 2));
      values.push(data.description);
    }
    if (data.tags !== undefined) {
      updates.push('tags = $' + (values.length + 2) + '::jsonb');
      values.push(JSON.stringify(data.tags));
    }
    if (data.status !== undefined) {
      updates.push('status = $' + (values.length + 2));
      values.push(data.status);
    }
    if (data.wells !== undefined) {
      updates.push('wells = $' + (values.length + 2) + '::jsonb');
      values.push(JSON.stringify(data.wells));
    }

    updates.push('last_modified = NOW()');

    const query = `
      UPDATE plates 
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const { rows } = await sql.query(query, [id, ...values]);

    if (rows.length === 0) {
      throw new Error('Plate not found');
    }

    const plate = rows[0];
    return {
      id: plate.id,
      project_id: plate.project_id,
      name: plate.name,
      plate_type: plate.plate_type,
      description: plate.description,
      created_by: plate.created_by,
      created_at: new Date(plate.created_at),
      last_modified: new Date(plate.last_modified),
      tags: typeof plate.tags === 'string' ? JSON.parse(plate.tags) : (plate.tags || []),
      status: plate.status,
      wells: typeof plate.wells === 'string' ? JSON.parse(plate.wells) : (plate.wells || {})
    };
  } catch (error) {
    console.error('Error updating plate:', error);
    throw new Error('Failed to update plate');
  }
}

export async function deletePlate(id: string): Promise<void> {
  try {
    await sql`DELETE FROM plates WHERE id = ${id}`;
  } catch (error) {
    console.error('Error deleting plate:', error);
    throw new Error('Failed to delete plate');
  }
}

export async function duplicatePlate(id: string, newName: string): Promise<Plate> {
  try {
    const original = await getPlate(id);
    if (!original) {
      throw new Error('Original plate not found');
    }

    // Convert tags and wells to JSON strings for storage
    const tagsJson = JSON.stringify(original.tags || []);
    const wellsJson = JSON.stringify(original.wells || {});

    const { rows } = await sql`
      INSERT INTO plates (
        project_id, name, plate_type, description, created_by,
        tags, status, wells, created_at, last_modified
      )
      VALUES (
        ${original.project_id}, ${newName}, ${original.plate_type},
        ${original.description || null}, ${original.created_by},
        ${tagsJson}::jsonb, 'draft', ${wellsJson}::jsonb,
        NOW(), NOW()
      )
      RETURNING *
    `;

    const plate = rows[0];
    return {
      id: plate.id,
      project_id: plate.project_id,
      name: plate.name,
      plate_type: plate.plate_type,
      description: plate.description,
      created_by: plate.created_by,
      created_at: new Date(plate.created_at),
      last_modified: new Date(plate.last_modified),
      tags: typeof plate.tags === 'string' ? JSON.parse(plate.tags) : (plate.tags || []),
      status: plate.status,
      wells: typeof plate.wells === 'string' ? JSON.parse(plate.wells) : (plate.wells || {})
    };
  } catch (error) {
    console.error('Error duplicating plate:', error);
    throw new Error('Failed to duplicate plate');
  }
}
