// Data service layer for the Assay Plate Manager
// This provides an abstraction layer for data operations

export interface AssayPlate {
  id: string;
  name: string;
  plateType: number;
  description?: string;
  createdBy: string;
  createdAt: Date;
  lastModified: Date;
  tags: string[];
  status: 'draft' | 'active' | 'completed' | 'archived';
  wells: { [key: string]: Well };
  metadata?: {
    experiment?: string;
    batchNumber?: string;
    temperature?: number;
    humidity?: number;
  };
}

export interface Well {
  cellType?: string;
  compound?: string;
  concentration?: string;
  concentrationUnits?: string;
  dilutionStep?: number;
  replicate?: number;
  titrationId?: string;
  volume?: number;
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  plates: AssayPlate[];
  createdAt: Date;
  lastModified: Date;
  collaborators?: string[];
  settings?: {
    defaultPlateType?: number;
    autoSave?: boolean;
    notifications?: boolean;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'researcher' | 'viewer';
  preferences: {
    defaultPlateType: number;
    theme: 'light' | 'dark';
    autoSave: boolean;
  };
}

// Abstract base class for data operations
export abstract class DataService {
  // Project operations
  abstract getProjects(): Promise<Project[]>;
  abstract getProject(id: string): Promise<Project | null>;
  abstract createProject(project: Omit<Project, 'id' | 'createdAt' | 'lastModified'>): Promise<Project>;
  abstract updateProject(id: string, updates: Partial<Project>): Promise<Project>;
  abstract deleteProject(id: string): Promise<void>;

  // Plate operations
  abstract getPlates(projectId: string): Promise<AssayPlate[]>;
  abstract getPlate(plateId: string): Promise<AssayPlate | null>;
  abstract createPlate(projectId: string, plate: Omit<AssayPlate, 'id' | 'createdAt' | 'lastModified'>): Promise<AssayPlate>;
  abstract updatePlate(plateId: string, updates: Partial<AssayPlate>): Promise<AssayPlate>;
  abstract deletePlate(plateId: string): Promise<void>;
  abstract duplicatePlate(plateId: string, newName: string): Promise<AssayPlate>;

  // Well operations
  abstract updateWells(plateId: string, wells: { [key: string]: Well }): Promise<void>;
  abstract getWellHistory(plateId: string, wellId: string): Promise<Well[]>;

  // Search and filtering
  abstract searchPlates(query: string, filters?: PlateFilters): Promise<AssayPlate[]>;
  abstract getPlatesByTag(tag: string): Promise<AssayPlate[]>;

  // Export operations
  abstract exportPlateToCSV(plateId: string): Promise<string>;
  abstract exportProjectData(projectId: string): Promise<any>;

  // User operations
  abstract getCurrentUser(): Promise<User>;
  abstract updateUserPreferences(preferences: Partial<User['preferences']>): Promise<User>;
}

export interface PlateFilters {
  status?: AssayPlate['status'][];
  plateType?: number[];
  createdBy?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
}

// Local storage implementation (for development/demo)
export class LocalStorageDataService extends DataService {
  private readonly PROJECTS_KEY = 'assay_projects';
  private readonly USER_KEY = 'assay_user';

  async getProjects(): Promise<Project[]> {
    const data = localStorage.getItem(this.PROJECTS_KEY);
    return data ? JSON.parse(data) : [];
  }

  async getProject(id: string): Promise<Project | null> {
    const projects = await this.getProjects();
    return projects.find(p => p.id === id) || null;
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'lastModified'>): Promise<Project> {
    const newProject: Project = {
      ...project,
      id: this.generateId(),
      createdAt: new Date(),
      lastModified: new Date(),
    };

    const projects = await this.getProjects();
    projects.push(newProject);
    localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(projects));
    
    return newProject;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const projects = await this.getProjects();
    const index = projects.findIndex(p => p.id === id);
    
    if (index === -1) {
      throw new Error('Project not found');
    }

    projects[index] = {
      ...projects[index],
      ...updates,
      lastModified: new Date(),
    };

    localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(projects));
    return projects[index];
  }

  async deleteProject(id: string): Promise<void> {
    const projects = await this.getProjects();
    const filtered = projects.filter(p => p.id !== id);
    localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(filtered));
  }

  async getPlates(projectId: string): Promise<AssayPlate[]> {
    const project = await this.getProject(projectId);
    return project?.plates || [];
  }

  async getPlate(plateId: string): Promise<AssayPlate | null> {
    const projects = await this.getProjects();
    for (const project of projects) {
      const plate = project.plates.find(p => p.id === plateId);
      if (plate) return plate;
    }
    return null;
  }

  async createPlate(projectId: string, plate: Omit<AssayPlate, 'id' | 'createdAt' | 'lastModified'>): Promise<AssayPlate> {
    const newPlate: AssayPlate = {
      ...plate,
      id: this.generateId(),
      createdAt: new Date(),
      lastModified: new Date(),
    };

    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    project.plates.push(newPlate);
    await this.updateProject(projectId, { plates: project.plates });
    
    return newPlate;
  }

  async updatePlate(plateId: string, updates: Partial<AssayPlate>): Promise<AssayPlate> {
    const projects = await this.getProjects();
    
    for (const project of projects) {
      const plateIndex = project.plates.findIndex(p => p.id === plateId);
      if (plateIndex !== -1) {
        project.plates[plateIndex] = {
          ...project.plates[plateIndex],
          ...updates,
          lastModified: new Date(),
        };
        
        await this.updateProject(project.id, { plates: project.plates });
        return project.plates[plateIndex];
      }
    }
    
    throw new Error('Plate not found');
  }

  async deletePlate(plateId: string): Promise<void> {
    const projects = await this.getProjects();
    
    for (const project of projects) {
      const plateIndex = project.plates.findIndex(p => p.id === plateId);
      if (plateIndex !== -1) {
        project.plates.splice(plateIndex, 1);
        await this.updateProject(project.id, { plates: project.plates });
        return;
      }
    }
    
    throw new Error('Plate not found');
  }

  async duplicatePlate(plateId: string, newName: string): Promise<AssayPlate> {
    const originalPlate = await this.getPlate(plateId);
    if (!originalPlate) {
      throw new Error('Plate not found');
    }

    // Find the project containing this plate
    const projects = await this.getProjects();
    let projectId = '';
    
    for (const project of projects) {
      if (project.plates.find(p => p.id === plateId)) {
        projectId = project.id;
        break;
      }
    }

    if (!projectId) {
      throw new Error('Project not found for plate');
    }

    const duplicatedPlate = {
      ...originalPlate,
      name: newName,
      status: 'draft' as const,
    };

    // Remove id, createdAt, lastModified so they get regenerated
    const { id, createdAt, lastModified, ...plateData } = duplicatedPlate;
    
    return this.createPlate(projectId, plateData);
  }

  async updateWells(plateId: string, wells: { [key: string]: Well }): Promise<void> {
    await this.updatePlate(plateId, { wells });
  }

  async getWellHistory(plateId: string, wellId: string): Promise<Well[]> {
    // TODO: Implement well history tracking
    // For now, return empty array
    return [];
  }

  async searchPlates(query: string, filters?: PlateFilters): Promise<AssayPlate[]> {
    const projects = await this.getProjects();
    let allPlates: AssayPlate[] = [];
    
    projects.forEach(project => {
      allPlates = allPlates.concat(project.plates);
    });

    // Apply text search
    if (query) {
      allPlates = allPlates.filter(plate => 
        plate.name.toLowerCase().includes(query.toLowerCase()) ||
        plate.description?.toLowerCase().includes(query.toLowerCase()) ||
        plate.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );
    }

    // Apply filters
    if (filters) {
      if (filters.status) {
        allPlates = allPlates.filter(plate => filters.status!.includes(plate.status));
      }
      
      if (filters.plateType) {
        allPlates = allPlates.filter(plate => filters.plateType!.includes(plate.plateType));
      }
      
      if (filters.createdBy) {
        allPlates = allPlates.filter(plate => filters.createdBy!.includes(plate.createdBy));
      }
      
      if (filters.tags) {
        allPlates = allPlates.filter(plate => 
          filters.tags!.some(tag => plate.tags.includes(tag))
        );
      }
      
      if (filters.dateRange) {
        allPlates = allPlates.filter(plate => 
          plate.createdAt >= filters.dateRange!.start && 
          plate.createdAt <= filters.dateRange!.end
        );
      }
    }

    return allPlates;
  }

  async getPlatesByTag(tag: string): Promise<AssayPlate[]> {
    return this.searchPlates('', { tags: [tag] });
  }

  async exportPlateToCSV(plateId: string): Promise<string> {
    const plate = await this.getPlate(plateId);
    if (!plate) {
      throw new Error('Plate not found');
    }

    // TODO: Implement CSV generation logic
    // This would convert the plate data to CSV format
    return 'CSV data would be generated here';
  }

  async exportProjectData(projectId: string): Promise<any> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    return {
      project,
      exportedAt: new Date(),
      format: 'json'
    };
  }

  async getCurrentUser(): Promise<User> {
    const userData = localStorage.getItem(this.USER_KEY);
    if (userData) {
      return JSON.parse(userData);
    }

    // Return default user
    const defaultUser: User = {
      id: 'user-1',
      name: 'Demo User',
      email: 'demo@example.com',
      role: 'researcher',
      preferences: {
        defaultPlateType: 96,
        theme: 'light',
        autoSave: true,
      }
    };

    localStorage.setItem(this.USER_KEY, JSON.stringify(defaultUser));
    return defaultUser;
  }

  async updateUserPreferences(preferences: Partial<User['preferences']>): Promise<User> {
    const user = await this.getCurrentUser();
    user.preferences = { ...user.preferences, ...preferences };
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    return user;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Database implementation outline (for production)
export class DatabaseDataService extends DataService {
  constructor(private apiBaseUrl: string) {
    super();
  }

  // TODO: Implement all methods using REST API calls
  // Example:
  async getProjects(): Promise<Project[]> {
    const response = await fetch(`${this.apiBaseUrl}/projects`);
    return response.json();
  }

  async getProject(id: string): Promise<Project | null> {
    const response = await fetch(`${this.apiBaseUrl}/projects/${id}`);
    if (response.status === 404) return null;
    return response.json();
  }

  // ... implement all other methods with API calls
  
  // Placeholder implementations
  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'lastModified'>): Promise<Project> {
    throw new Error('Not implemented');
  }
  
  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    throw new Error('Not implemented');
  }
  
  async deleteProject(id: string): Promise<void> {
    throw new Error('Not implemented');
  }
  
  async getPlates(projectId: string): Promise<AssayPlate[]> {
    throw new Error('Not implemented');
  }
  
  async getPlate(plateId: string): Promise<AssayPlate | null> {
    throw new Error('Not implemented');
  }
  
  async createPlate(projectId: string, plate: Omit<AssayPlate, 'id' | 'createdAt' | 'lastModified'>): Promise<AssayPlate> {
    throw new Error('Not implemented');
  }
  
  async updatePlate(plateId: string, updates: Partial<AssayPlate>): Promise<AssayPlate> {
    throw new Error('Not implemented');
  }
  
  async deletePlate(plateId: string): Promise<void> {
    throw new Error('Not implemented');
  }
  
  async duplicatePlate(plateId: string, newName: string): Promise<AssayPlate> {
    throw new Error('Not implemented');
  }
  
  async updateWells(plateId: string, wells: { [key: string]: Well }): Promise<void> {
    throw new Error('Not implemented');
  }
  
  async getWellHistory(plateId: string, wellId: string): Promise<Well[]> {
    throw new Error('Not implemented');
  }
  
  async searchPlates(query: string, filters?: PlateFilters): Promise<AssayPlate[]> {
    throw new Error('Not implemented');
  }
  
  async getPlatesByTag(tag: string): Promise<AssayPlate[]> {
    throw new Error('Not implemented');
  }
  
  async exportPlateToCSV(plateId: string): Promise<string> {
    throw new Error('Not implemented');
  }
  
  async exportProjectData(projectId: string): Promise<any> {
    throw new Error('Not implemented');
  }
  
  async getCurrentUser(): Promise<User> {
    throw new Error('Not implemented');
  }
  
  async updateUserPreferences(preferences: Partial<User['preferences']>): Promise<User> {
    throw new Error('Not implemented');
  }
}

// Factory function to create appropriate data service
export function createDataService(type: 'localStorage' | 'database', config?: any): DataService {
  switch (type) {
    case 'localStorage':
      return new LocalStorageDataService();
    case 'database':
      return new DatabaseDataService(config?.apiBaseUrl || '/api');
    default:
      throw new Error('Unknown data service type');
  }
}
