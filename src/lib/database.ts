import { sql } from '@vercel/postgres';

export interface Project {
  id: string;
  name: string;
  description?: string;
  created_by: string;
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
export async function getProjects(userId?: string): Promise<ProjectWithPlates[]> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get projects filtered by user
    const { rows: projects } = await sql`SELECT * FROM projects WHERE created_by = ${userId} ORDER BY created_at DESC`;

    // Get plates for these projects filtered by user
    const { rows: plates } = await sql`SELECT * FROM plates WHERE created_by = ${userId} ORDER BY created_at DESC`;

    // Group plates by project
    const projectsWithPlates: ProjectWithPlates[] = projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      created_by: project.created_by,
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

export async function getProject(id: string, userId?: string): Promise<ProjectWithPlates | null> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const { rows: projects } = await sql`SELECT * FROM projects WHERE id = ${id} AND created_by = ${userId}`;

    if (projects.length === 0) {
      return null;
    }

    const { rows: plates } = await sql`SELECT * FROM plates WHERE project_id = ${id} AND created_by = ${userId} ORDER BY created_at DESC`;

    const project = projects[0];
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      created_by: project.created_by,
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
  created_by: string; // Make required
}): Promise<Project> {
  try {
    if (!data.created_by) {
      throw new Error('User ID is required');
    }

    const { rows } = await sql`
      INSERT INTO projects (name, description, created_by, created_at, last_modified)
      VALUES (${data.name}, ${data.description || null}, ${data.created_by}, NOW(), NOW())
      RETURNING *
    `;

    const project = rows[0];
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      created_by: project.created_by,
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
}, userId: string): Promise<Project> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const updates = [];
    const values = [];

    if (data.name !== undefined) {
      updates.push('name = $' + (values.length + 3));
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = $' + (values.length + 3));
      values.push(data.description);
    }

    updates.push('last_modified = NOW()');

    const query = `
      UPDATE projects 
      SET ${updates.join(', ')}
      WHERE id = $1 AND created_by = $2
      RETURNING *
    `;

    const { rows } = await sql.query(query, [id, userId, ...values]);

    if (rows.length === 0) {
      throw new Error('Project not found or unauthorized');
    }

    const project = rows[0];
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      created_by: project.created_by,
      created_at: new Date(project.created_at),
      last_modified: new Date(project.last_modified)
    };
  } catch (error) {
    console.error('Error updating project:', error);
    throw new Error('Failed to update project');
  }
}

export async function deleteProject(id: string, userId: string): Promise<void> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const result = await sql`DELETE FROM projects WHERE id = ${id} AND created_by = ${userId}`;
    
    if (result.rowCount === 0) {
      throw new Error('Project not found or unauthorized');
    }
  } catch (error) {
    console.error('Error deleting project:', error);
    throw new Error('Failed to delete project');
  }
}

// Plate operations
export async function getPlates(projectId: string, userId: string): Promise<Plate[]> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const { rows } = await sql`SELECT * FROM plates WHERE project_id = ${projectId} AND created_by = ${userId} ORDER BY created_at DESC`;

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

export async function getPlate(id: string, userId: string): Promise<Plate | null> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const { rows } = await sql`SELECT * FROM plates WHERE id = ${id} AND created_by = ${userId}`;

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
  created_by: string; // Make required
  tags?: string[];
  status?: 'draft' | 'active' | 'completed' | 'archived';
}): Promise<Plate> {
  try {
    if (!data.created_by) {
      throw new Error('User ID is required');
    }

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
  plate_type?: number;
  tags?: string[];
  status?: 'draft' | 'active' | 'completed' | 'archived';
  wells?: Record<string, any>;
}, userId: string): Promise<Plate> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const updates = [];
    const values = [];

    if (data.name !== undefined) {
      updates.push('name = $' + (values.length + 3));
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = $' + (values.length + 3));
      values.push(data.description);
    }
    if (data.plate_type !== undefined) {
      updates.push('plate_type = $' + (values.length + 3));
      values.push(data.plate_type);
    }
    if (data.tags !== undefined) {
      updates.push('tags = $' + (values.length + 3) + '::jsonb');
      values.push(JSON.stringify(data.tags));
    }
    if (data.status !== undefined) {
      updates.push('status = $' + (values.length + 3));
      values.push(data.status);
    }
    if (data.wells !== undefined) {
      updates.push('wells = $' + (values.length + 3) + '::jsonb');
      values.push(JSON.stringify(data.wells));
    }

    updates.push('last_modified = NOW()');

    const query = `
      UPDATE plates 
      SET ${updates.join(', ')}
      WHERE id = $1 AND created_by = $2
      RETURNING *
    `;

    const { rows } = await sql.query(query, [id, userId, ...values]);

    if (rows.length === 0) {
      throw new Error('Plate not found or unauthorized');
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

export async function deletePlate(id: string, userId: string): Promise<void> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const result = await sql`DELETE FROM plates WHERE id = ${id} AND created_by = ${userId}`;
    
    if (result.rowCount === 0) {
      throw new Error('Plate not found or unauthorized');
    }
  } catch (error) {
    console.error('Error deleting plate:', error);
    throw new Error('Failed to delete plate');
  }
}

export async function duplicatePlate(id: string, newName: string, userId: string): Promise<Plate> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const original = await getPlate(id, userId);
    if (!original) {
      throw new Error('Original plate not found or unauthorized');
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

// User compounds management
export interface UserCompound {
  id: string;
  user_id: string;
  compound_name: string;
  description?: string;
  created_at: Date;
  last_used: Date;
  use_count: number;
}

export interface UserCellType {
  id: string;
  user_id: string;
  cell_type_name: string;
  description?: string;
  created_at: Date;
  last_used: Date;
  use_count: number;
}

export async function getUserCompounds(userId: string): Promise<UserCompound[]> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const { rows } = await sql.query(`
      SELECT * FROM user_compounds 
      WHERE user_id = $1 
      ORDER BY use_count DESC, last_used DESC
      LIMIT 100
    `, [userId]);

    return rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      compound_name: row.compound_name,
      description: row.description,
      created_at: new Date(row.created_at),
      last_used: new Date(row.last_used),
      use_count: row.use_count
    }));
  } catch (error) {
    console.error('Error fetching user compounds:', error);
    throw error;
  }
}

export async function getUserCellTypes(userId: string): Promise<UserCellType[]> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const { rows } = await sql.query(`
      SELECT * FROM user_cell_types 
      WHERE user_id = $1 
      ORDER BY use_count DESC, last_used DESC
      LIMIT 100
    `, [userId]);

    return rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      cell_type_name: row.cell_type_name,
      description: row.description,
      created_at: new Date(row.created_at),
      last_used: new Date(row.last_used),
      use_count: row.use_count
    }));
  } catch (error) {
    console.error('Error fetching user cell types:', error);
    throw error;
  }
}

export async function addOrUpdateUserCompound(userId: string, compoundName: string): Promise<UserCompound> {
  try {
    if (!userId || !compoundName) {
      throw new Error('User ID and compound name are required');
    }

    const { rows } = await sql.query(`
      INSERT INTO user_compounds (user_id, compound_name, last_used, use_count)
      VALUES ($1, $2, NOW(), 1)
      ON CONFLICT (user_id, compound_name)
      DO UPDATE SET 
        last_used = NOW(),
        use_count = user_compounds.use_count + 1
      RETURNING *
    `, [userId, compoundName]);

    const compound = rows[0];
    return {
      id: compound.id,
      user_id: compound.user_id,
      compound_name: compound.compound_name,
      description: compound.description,
      created_at: new Date(compound.created_at),
      last_used: new Date(compound.last_used),
      use_count: compound.use_count
    };
  } catch (error) {
    console.error('Error adding/updating user compound:', error);
    throw error;
  }
}

export async function addOrUpdateUserCellType(userId: string, cellTypeName: string): Promise<UserCellType> {
  try {
    if (!userId || !cellTypeName) {
      throw new Error('User ID and cell type name are required');
    }

    const { rows } = await sql.query(`
      INSERT INTO user_cell_types (user_id, cell_type_name, last_used, use_count)
      VALUES ($1, $2, NOW(), 1)
      ON CONFLICT (user_id, cell_type_name)
      DO UPDATE SET 
        last_used = NOW(),
        use_count = user_cell_types.use_count + 1
      RETURNING *
    `, [userId, cellTypeName]);

    const cellType = rows[0];
    return {
      id: cellType.id,
      user_id: cellType.user_id,
      cell_type_name: cellType.cell_type_name,
      description: cellType.description,
      created_at: new Date(cellType.created_at),
      last_used: new Date(cellType.last_used),
      use_count: cellType.use_count
    };
  } catch (error) {
    console.error('Error adding/updating user cell type:', error);
    throw error;
  }
}

// Plate template management
export interface PlateTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  plate_type: number;
  template_wells: Record<string, any>;
  dosing_parameters: {
    concentrations?: number[];
    concentration_units?: string;
    replicates?: number;
    dilution_factor?: number;
  };
  control_configuration: {
    positive_controls?: string[];
    negative_controls?: string[];
    blank_wells?: string[];
  };
  created_at: Date;
  last_modified: Date;
  use_count: number;
}

export async function getPlateTemplates(userId: string): Promise<PlateTemplate[]> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const { rows } = await sql.query(`
      SELECT * FROM plate_templates 
      WHERE user_id = $1 
      ORDER BY use_count DESC, last_modified DESC
    `, [userId]);

    return rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      description: row.description,
      plate_type: row.plate_type,
      template_wells: typeof row.template_wells === 'string' ? JSON.parse(row.template_wells) : (row.template_wells || {}),
      dosing_parameters: typeof row.dosing_parameters === 'string' ? JSON.parse(row.dosing_parameters) : (row.dosing_parameters || {}),
      control_configuration: typeof row.control_configuration === 'string' ? JSON.parse(row.control_configuration) : (row.control_configuration || {}),
      created_at: new Date(row.created_at),
      last_modified: new Date(row.last_modified),
      use_count: row.use_count
    }));
  } catch (error) {
    console.error('Error fetching plate templates:', error);
    throw error;
  }
}

export async function getPlateTemplate(id: string, userId: string): Promise<PlateTemplate | null> {
  try {
    if (!userId || !id) {
      throw new Error('User ID and template ID are required');
    }

    const { rows } = await sql.query(`
      SELECT * FROM plate_templates 
      WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      description: row.description,
      plate_type: row.plate_type,
      template_wells: typeof row.template_wells === 'string' ? JSON.parse(row.template_wells) : (row.template_wells || {}),
      dosing_parameters: typeof row.dosing_parameters === 'string' ? JSON.parse(row.dosing_parameters) : (row.dosing_parameters || {}),
      control_configuration: typeof row.control_configuration === 'string' ? JSON.parse(row.control_configuration) : (row.control_configuration || {}),
      created_at: new Date(row.created_at),
      last_modified: new Date(row.last_modified),
      use_count: row.use_count
    };
  } catch (error) {
    console.error('Error fetching plate template:', error);
    throw error;
  }
}

export async function createPlateTemplate(data: {
  user_id: string;
  name: string;
  description?: string;
  plate_type: number;
  template_wells: Record<string, any>;
  dosing_parameters: object;
  control_configuration: object;
}): Promise<PlateTemplate> {
  try {
    const { rows } = await sql.query(`
      INSERT INTO plate_templates (
        user_id, name, description, plate_type, template_wells, 
        dosing_parameters, control_configuration, created_at, last_modified, use_count
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, NOW(), NOW(), 0)
      RETURNING *
    `, [
      data.user_id,
      data.name,
      data.description,
      data.plate_type,
      JSON.stringify(data.template_wells),
      JSON.stringify(data.dosing_parameters),
      JSON.stringify(data.control_configuration)
    ]);

    const template = rows[0];
    return {
      id: template.id,
      user_id: template.user_id,
      name: template.name,
      description: template.description,
      plate_type: template.plate_type,
      template_wells: typeof template.template_wells === 'string' ? JSON.parse(template.template_wells) : (template.template_wells || {}),
      dosing_parameters: typeof template.dosing_parameters === 'string' ? JSON.parse(template.dosing_parameters) : (template.dosing_parameters || {}),
      control_configuration: typeof template.control_configuration === 'string' ? JSON.parse(template.control_configuration) : (template.control_configuration || {}),
      created_at: new Date(template.created_at),
      last_modified: new Date(template.last_modified),
      use_count: template.use_count
    };
  } catch (error) {
    console.error('Error creating plate template:', error);
    throw error;
  }
}

export async function updatePlateTemplate(id: string, data: {
  name?: string;
  description?: string;
  plate_type?: number;
  template_wells?: Record<string, any>;
  dosing_parameters?: object;
  control_configuration?: object;
}, userId: string): Promise<PlateTemplate> {
  try {
    const updates = [];
    const values = [];

    if (data.name !== undefined) {
      updates.push('name = $' + (values.length + 3));
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = $' + (values.length + 3));
      values.push(data.description);
    }
    if (data.plate_type !== undefined) {
      updates.push('plate_type = $' + (values.length + 3));
      values.push(data.plate_type);
    }
    if (data.template_wells !== undefined) {
      updates.push('template_wells = $' + (values.length + 3) + '::jsonb');
      values.push(JSON.stringify(data.template_wells));
    }
    if (data.dosing_parameters !== undefined) {
      updates.push('dosing_parameters = $' + (values.length + 3) + '::jsonb');
      values.push(JSON.stringify(data.dosing_parameters));
    }
    if (data.control_configuration !== undefined) {
      updates.push('control_configuration = $' + (values.length + 3) + '::jsonb');
      values.push(JSON.stringify(data.control_configuration));
    }

    updates.push('last_modified = NOW()');

    const query = `
      UPDATE plate_templates 
      SET ${updates.join(', ')}
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const { rows } = await sql.query(query, [id, userId, ...values]);

    if (rows.length === 0) {
      throw new Error('Template not found or unauthorized');
    }

    const template = rows[0];
    return {
      id: template.id,
      user_id: template.user_id,
      name: template.name,
      description: template.description,
      plate_type: template.plate_type,
      template_wells: typeof template.template_wells === 'string' ? JSON.parse(template.template_wells) : (template.template_wells || {}),
      dosing_parameters: typeof template.dosing_parameters === 'string' ? JSON.parse(template.dosing_parameters) : (template.dosing_parameters || {}),
      control_configuration: typeof template.control_configuration === 'string' ? JSON.parse(template.control_configuration) : (template.control_configuration || {}),
      created_at: new Date(template.created_at),
      last_modified: new Date(template.last_modified),
      use_count: template.use_count
    };
  } catch (error) {
    console.error('Error updating plate template:', error);
    throw error;
  }
}

export async function deletePlateTemplate(id: string, userId: string): Promise<void> {
  try {
    const { rowCount } = await sql.query(`
      DELETE FROM plate_templates 
      WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (rowCount === 0) {
      throw new Error('Template not found or unauthorized');
    }
  } catch (error) {
    console.error('Error deleting plate template:', error);
    throw error;
  }
}

export async function incrementTemplateUsage(id: string, userId: string): Promise<void> {
  try {
    await sql.query(`
      UPDATE plate_templates 
      SET use_count = use_count + 1, last_modified = NOW()
      WHERE id = $1 AND user_id = $2
    `, [id, userId]);
  } catch (error) {
    console.error('Error incrementing template usage:', error);
    throw error;
  }
}
