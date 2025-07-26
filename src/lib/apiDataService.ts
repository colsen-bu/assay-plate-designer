// API-based data service for production use with Vercel Postgres

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

class ApiDataService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log('Making API request to:', url);
    console.log('Request options:', options);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        credentials: 'include', // Important: Include cookies for authentication
        ...options,
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.log('Error response data:', errorData);
        } catch (jsonError) {
          console.log('Failed to parse error response as JSON:', jsonError);
          errorData = { error: `HTTP ${response.status} - ${response.statusText}` };
        }
        
        const errorMessage = errorData.error || `HTTP ${response.status}`;
        console.log('Throwing error:', errorMessage);
        
        // Handle authentication errors specifically
        if (response.status === 401) {
          throw new Error('Authentication required. Please sign in.');
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Successful response data:', data);
      return data;
    } catch (fetchError) {
      console.error('Fetch error occurred:', fetchError);
      
      // Re-throw the error to be handled by the calling code
      throw fetchError;
    }
  }

  // Project operations
  async getProjects(): Promise<ProjectWithPlates[]> {
    const projects = await this.request<any[]>('/projects');
    return projects.map(project => ({
      ...project,
      created_at: new Date(project.created_at),
      last_modified: new Date(project.last_modified),
      plates: project.plates.map((plate: any) => ({
        ...plate,
        created_at: new Date(plate.created_at),
        last_modified: new Date(plate.last_modified)
      }))
    }));
  }

  async getProject(id: string): Promise<ProjectWithPlates | null> {
    try {
      const project = await this.request<any>(`/projects/${id}`);
      return {
        ...project,
        created_at: new Date(project.created_at),
        last_modified: new Date(project.last_modified),
        plates: project.plates.map((plate: any) => ({
          ...plate,
          created_at: new Date(plate.created_at),
          last_modified: new Date(plate.last_modified)
        }))
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async createProject(data: {
    name: string;
    description?: string;
  }): Promise<Project> {
    const project = await this.request<any>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return {
      ...project,
      created_at: new Date(project.created_at),
      last_modified: new Date(project.last_modified)
    };
  }

  async updateProject(id: string, data: {
    name?: string;
    description?: string;
  }): Promise<Project> {
    const project = await this.request<any>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    return {
      ...project,
      created_at: new Date(project.created_at),
      last_modified: new Date(project.last_modified)
    };
  }

  async deleteProject(id: string): Promise<void> {
    await this.request(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Plate operations
  async getPlates(projectId: string): Promise<Plate[]> {
    const plates = await this.request<any[]>(`/projects/${projectId}/plates`);
    return plates.map(plate => ({
      ...plate,
      created_at: new Date(plate.created_at),
      last_modified: new Date(plate.last_modified)
    }));
  }

  async getPlate(id: string): Promise<Plate | null> {
    try {
      const plate = await this.request<any>(`/plates/${id}`);
      return {
        ...plate,
        created_at: new Date(plate.created_at),
        last_modified: new Date(plate.last_modified)
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async createPlate(projectId: string, data: {
    name: string;
    plate_type: number;
    description?: string;
    created_by: string;
    tags?: string[];
    status?: 'draft' | 'active' | 'completed' | 'archived';
  }): Promise<Plate> {
    const plate = await this.request<any>(`/projects/${projectId}/plates`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return {
      ...plate,
      created_at: new Date(plate.created_at),
      last_modified: new Date(plate.last_modified)
    };
  }

  async updatePlate(id: string, data: {
    name?: string;
    description?: string;
    plate_type?: number;
    tags?: string[];
    status?: 'draft' | 'active' | 'completed' | 'archived';
    wells?: Record<string, any>;
  }): Promise<Plate> {
    const plate = await this.request<any>(`/plates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    return {
      ...plate,
      created_at: new Date(plate.created_at),
      last_modified: new Date(plate.last_modified)
    };
  }

  async deletePlate(id: string): Promise<void> {
    await this.request(`/plates/${id}`, {
      method: 'DELETE',
    });
  }

  async duplicatePlate(id: string, newName: string): Promise<Plate> {
    const plate = await this.request<any>(`/plates/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ name: newName }),
    });

    return {
      ...plate,
      created_at: new Date(plate.created_at),
      last_modified: new Date(plate.last_modified)
    };
  }

  async updateWells(plateId: string, wells: Record<string, any>): Promise<void> {
    await this.updatePlate(plateId, { wells });
  }

  // User compounds and cell types management
  async getUserCompounds(): Promise<any[]> {
    return await this.request<any[]>('/user-compounds');
  }

  async addUserCompound(compoundName: string): Promise<any> {
    return await this.request<any>('/user-compounds', {
      method: 'POST',
      body: JSON.stringify({ compound_name: compoundName }),
    });
  }

  async getUserCellTypes(): Promise<any[]> {
    return await this.request<any[]>('/user-cell-types');
  }

  async addUserCellType(cellTypeName: string): Promise<any> {
    return await this.request<any>('/user-cell-types', {
      method: 'POST',
      body: JSON.stringify({ cell_type_name: cellTypeName }),
    });
  }

  // Plate template management
  async getPlateTemplates(): Promise<any[]> {
    return await this.request<any[]>('/plate-templates');
  }

  async getPlateTemplate(templateId: string): Promise<any> {
    return await this.request<any>(`/plate-templates/${templateId}`);
  }

  async createPlateTemplate(data: {
    name: string;
    description?: string;
    plate_type: number;
    template_wells: Record<string, any>;
    dosing_parameters: object;
    control_configuration: object;
  }): Promise<any> {
    return await this.request<any>('/plate-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePlateTemplate(templateId: string, data: any): Promise<any> {
    return await this.request<any>(`/plate-templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePlateTemplate(templateId: string): Promise<void> {
    await this.request(`/plate-templates/${templateId}`, {
      method: 'DELETE',
    });
  }

  async generatePlatesFromTemplate(templateId: string, data: {
    project_id: string;
    compounds: string[];
    plate_name_prefix?: string;
  }): Promise<any> {
    return await this.request<any>(`/plate-templates/${templateId}/generate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiDataService = new ApiDataService();
