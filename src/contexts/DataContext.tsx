"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DataService, createDataService, Project, AssayPlate, User } from '../services/dataService';

interface DataContextType {
  // Data service
  dataService: DataService;
  
  // Current state
  projects: Project[];
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  refreshProjects: () => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  setCurrentPlate: (plate: AssayPlate | null) => void;
  
  // Current selections
  currentProject: Project | null;
  currentPlate: AssayPlate | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

interface DataProviderProps {
  children: ReactNode;
  serviceType?: 'localStorage' | 'database';
  config?: any;
}

export const DataProvider: React.FC<DataProviderProps> = ({ 
  children, 
  serviceType = 'localStorage',
  config 
}) => {
  const [dataService] = useState(() => createDataService(serviceType, config));
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentPlate, setCurrentPlate] = useState<AssayPlate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize data on mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load user and projects
        const [user, projectsData] = await Promise.all([
          dataService.getCurrentUser(),
          dataService.getProjects()
        ]);
        
        setCurrentUser(user);
        setProjects(projectsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        console.error('Failed to initialize data:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [dataService]);

  const refreshProjects = async () => {
    try {
      setError(null);
      const projectsData = await dataService.getProjects();
      setProjects(projectsData);
      
      // Update current project if it's still in the list
      if (currentProject) {
        const updatedProject = projectsData.find(p => p.id === currentProject.id);
        setCurrentProject(updatedProject || null);
        
        // Update current plate if it's still in the updated project
        if (currentPlate && updatedProject) {
          const updatedPlate = updatedProject.plates.find(p => p.id === currentPlate.id);
          setCurrentPlate(updatedPlate || null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh projects');
      console.error('Failed to refresh projects:', err);
    }
  };

  const value: DataContextType = {
    dataService,
    projects,
    currentUser,
    loading,
    error,
    refreshProjects,
    setCurrentProject,
    setCurrentPlate,
    currentProject,
    currentPlate,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

// Hook for project operations
export const useProjects = () => {
  const { dataService, projects, refreshProjects, error } = useData();

  const createProject = async (projectData: Omit<Project, 'id' | 'createdAt' | 'lastModified'>) => {
    try {
      await dataService.createProject(projectData);
      await refreshProjects();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create project');
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      await dataService.updateProject(id, updates);
      await refreshProjects();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update project');
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await dataService.deleteProject(id);
      await refreshProjects();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  return {
    projects,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects,
    error,
  };
};

// Hook for plate operations
export const usePlates = (projectId?: string) => {
  const { dataService, refreshProjects, currentProject, error } = useData();
  const [plates, setPlates] = useState<AssayPlate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadPlates = async () => {
      if (!projectId && !currentProject) return;
      
      try {
        setLoading(true);
        const plateData = await dataService.getPlates(projectId || currentProject!.id);
        setPlates(plateData);
      } catch (err) {
        console.error('Failed to load plates:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPlates();
  }, [projectId, currentProject, dataService]);

  const createPlate = async (plateData: Omit<AssayPlate, 'id' | 'createdAt' | 'lastModified'>) => {
    if (!projectId && !currentProject) {
      throw new Error('No project selected');
    }

    try {
      await dataService.createPlate(projectId || currentProject!.id, plateData);
      await refreshProjects();
      
      // Reload plates for this project
      const plateData2 = await dataService.getPlates(projectId || currentProject!.id);
      setPlates(plateData2);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create plate');
    }
  };

  const updatePlate = async (plateId: string, updates: Partial<AssayPlate>) => {
    try {
      await dataService.updatePlate(plateId, updates);
      await refreshProjects();
      
      // Reload plates for this project
      if (projectId || currentProject) {
        const plateData = await dataService.getPlates(projectId || currentProject!.id);
        setPlates(plateData);
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update plate');
    }
  };

  const deletePlate = async (plateId: string) => {
    try {
      await dataService.deletePlate(plateId);
      await refreshProjects();
      
      // Reload plates for this project
      if (projectId || currentProject) {
        const plateData = await dataService.getPlates(projectId || currentProject!.id);
        setPlates(plateData);
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete plate');
    }
  };

  const duplicatePlate = async (plateId: string, newName: string) => {
    try {
      await dataService.duplicatePlate(plateId, newName);
      await refreshProjects();
      
      // Reload plates for this project
      if (projectId || currentProject) {
        const plateData = await dataService.getPlates(projectId || currentProject!.id);
        setPlates(plateData);
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to duplicate plate');
    }
  };

  const updateWells = async (plateId: string, wells: { [key: string]: any }) => {
    try {
      await dataService.updateWells(plateId, wells);
      await refreshProjects();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update wells');
    }
  };

  return {
    plates: currentProject ? currentProject.plates : plates,
    createPlate,
    updatePlate,
    deletePlate,
    duplicatePlate,
    updateWells,
    loading,
    error,
  };
};

// Hook for user operations
export const useUser = () => {
  const { dataService, currentUser } = useData();

  const updatePreferences = async (preferences: Partial<User['preferences']>) => {
    try {
      await dataService.updateUserPreferences(preferences);
      // Note: In a real implementation, you'd refresh the user data here
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update preferences');
    }
  };

  return {
    user: currentUser,
    updatePreferences,
  };
};
