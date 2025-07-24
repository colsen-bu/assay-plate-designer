"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit, Trash2, Copy, Calendar, User, FileText } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import AssayPlateDesigner from './AssayPlateDesigner';
import { apiDataService, ProjectWithPlates, Plate } from '../lib/apiDataService';

// Modal components outside of main component to prevent recreation on every render
const CreateProjectModal = ({ 
  show, 
  projectForm, 
  onClose, 
  onCreate, 
  onNameChange, 
  onDescriptionChange 
}: {
  show: boolean;
  projectForm: { name: string; description: string };
  onClose: () => void;
  onCreate: () => void;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) => {
  const projectNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (show && projectNameRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        projectNameRef.current?.focus();
      }, 100);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Create New Project</h2>
        <div className="space-y-4">
          <input
            ref={projectNameRef}
            type="text"
            placeholder="Project Name"
            value={projectForm.name}
            onChange={onNameChange}
            className="w-full p-2 border rounded"
          />
          <textarea
            placeholder="Project Description"
            value={projectForm.description}
            onChange={onDescriptionChange}
            className="w-full p-2 border rounded h-24 resize-none"
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

const CreatePlateModal = ({ 
  show, 
  plateForm, 
  onClose, 
  onCreate, 
  onNameChange, 
  onDescriptionChange,
  onTypeChange,
  onTagsChange
}: {
  show: boolean;
  plateForm: { name: string; description: string; plate_type: number; tags: string; created_by: string };
  onClose: () => void;
  onCreate: () => void;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onTagsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  const plateNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (show && plateNameRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        plateNameRef.current?.focus();
      }, 100);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Create New Plate</h2>
        <div className="space-y-4">
          <input
            ref={plateNameRef}
            type="text"
            placeholder="Plate Name"
            value={plateForm.name}
            onChange={onNameChange}
            className="w-full p-2 border rounded"
          />
          <textarea
            placeholder="Plate Description"
            value={plateForm.description}
            onChange={onDescriptionChange}
            className="w-full p-2 border rounded h-24 resize-none"
          />
          <select 
            value={plateForm.plate_type}
            onChange={onTypeChange}
            className="w-full p-2 border rounded"
          >
            <option value={0}>Select Plate Type</option>
            <option value={6}>6-well plate</option>
            <option value={12}>12-well plate</option>
            <option value={24}>24-well plate</option>
            <option value={48}>48-well plate</option>
            <option value={96}>96-well plate</option>
            <option value={384}>384-well plate</option>
          </select>
          <input
            type="text"
            placeholder="Tags (comma separated)"
            value={plateForm.tags}
            onChange={onTagsChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

const AssayPlateManager = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [projects, setProjects] = useState<ProjectWithPlates[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectWithPlates | null>(null);
  const [selectedPlate, setSelectedPlate] = useState<Plate | null>(null);
  const [view, setView] = useState<'projects' | 'plates' | 'editor'>('projects');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreatePlate, setShowCreatePlate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [projectForm, setProjectForm] = useState({ name: '', description: '' });
  const [plateForm, setPlateForm] = useState({
    name: '',
    description: '',
    plate_type: 0, // 0 means no plate type selected
    tags: '',
    created_by: user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Unknown User'
  });

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Update created_by when user changes
  useEffect(() => {
    if (user) {
      setPlateForm(prev => ({
        ...prev,
        created_by: user.fullName || user.primaryEmailAddress?.emailAddress || 'Unknown User'
      }));
    }
  }, [user]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const projectsData = await apiDataService.getProjects();
      setProjects(projectsData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

    const handlePlateUpdate = async (plateId: string, wells: Record<string, any>) => {
    try {
      await apiDataService.updatePlate(plateId, { wells });
      
      // Update the local state to reflect the changes
      setProjects(prevProjects => 
        prevProjects.map(project => ({
          ...project,
          plates: project.plates.map(plate => 
            plate.id === plateId 
              ? { ...plate, wells, last_modified: new Date() }
              : plate
          )
        }))
      );

      // Update selectedPlate if it's the one being updated
      if (selectedPlate?.id === plateId) {
        setSelectedPlate(prev => prev ? { ...prev, wells, last_modified: new Date() } : null);
      }
    } catch (err) {
      console.error('Failed to update plate:', err);
      setError(err instanceof Error ? err.message : 'Failed to update plate');
    }
  };

  const handleStatusUpdate = async (plateId: string, newStatus: 'draft' | 'active' | 'completed' | 'archived') => {
    try {
      await apiDataService.updatePlate(plateId, { status: newStatus });
      
      // Update the local state to reflect the changes
      setProjects(prevProjects => 
        prevProjects.map(project => ({
          ...project,
          plates: project.plates.map(plate => 
            plate.id === plateId 
              ? { ...plate, status: newStatus, last_modified: new Date() }
              : plate
          )
        }))
      );

      // Update selectedProject if it contains the updated plate
      if (selectedProject) {
        setSelectedProject(prev => prev ? {
          ...prev,
          plates: prev.plates.map(plate => 
            plate.id === plateId 
              ? { ...plate, status: newStatus, last_modified: new Date() }
              : plate
          )
        } : null);
      }

      // Update selectedPlate if it's the one being updated
      if (selectedPlate?.id === plateId) {
        setSelectedPlate(prev => prev ? { ...prev, status: newStatus, last_modified: new Date() } : null);
      }
    } catch (err) {
      console.error('Failed to update plate status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update plate status');
    }
  };

  const handleCreateProject = async () => {
    try {
      if (!projectForm.name.trim()) {
        alert('Project name is required');
        return;
      }

      await apiDataService.createProject({
        name: projectForm.name,
        description: projectForm.description || undefined
      });

      setProjectForm({ name: '', description: '' });
      setShowCreateProject(false);
      await loadProjects();
    } catch (err) {
      console.error('Failed to create project:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      alert(errorMessage);
    }
  };

  const handleCreatePlate = async () => {
    try {
      if (!plateForm.name.trim()) {
        alert('Plate name is required');
        return;
      }

      if (!selectedProject) {
        alert('No project selected');
        return;
      }

      if (!plateForm.plate_type || plateForm.plate_type <= 0) {
        alert('Please select a plate type');
        return;
      }

      const tags = plateForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      const plateData = {
        name: plateForm.name,
        plate_type: plateForm.plate_type,
        description: plateForm.description || undefined,
        created_by: plateForm.created_by,
        tags
      };

      await apiDataService.createPlate(selectedProject.id, plateData);

      setPlateForm({
        name: '',
        description: '',
        plate_type: 0,
        tags: '',
        created_by: user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Unknown User'
      });
      setShowCreatePlate(false);
      await loadProjects();
      
      // Update selected project
      const updatedProject = await apiDataService.getProject(selectedProject.id);
      if (updatedProject) {
        setSelectedProject(updatedProject);
      }
    } catch (err) {
      console.error('Failed to create plate:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create plate';
      alert(errorMessage);
    }
  };

  // Stable event handlers to prevent input focus issues
  const handleProjectNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectForm(prev => ({ ...prev, name: e.target.value }));
  }, []);

  const handleProjectDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setProjectForm(prev => ({ ...prev, description: e.target.value }));
  }, []);

  const handlePlateNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPlateForm(prev => ({ ...prev, name: e.target.value }));
  }, []);

  const handlePlateDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPlateForm(prev => ({ ...prev, description: e.target.value }));
  }, []);

  const handlePlateTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setPlateForm(prev => ({ ...prev, plate_type: Number(e.target.value) }));
  }, []);

  const handlePlateTagsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPlateForm(prev => ({ ...prev, tags: e.target.value }));
  }, []);

  const handleCloseProjectModal = useCallback(() => {
    setShowCreateProject(false);
    setProjectForm({ name: '', description: '' });
  }, []);

  const handleClosePlateModal = useCallback(() => {
    setShowCreatePlate(false);
    setPlateForm({
      name: '',
      description: '',
      plate_type: 0,
      tags: '',
      created_by: user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Unknown User'
    });
  }, [user]);

  const handleDuplicatePlate = async (plateId: string, plateName: string) => {
    try {
      const newName = prompt('Enter name for duplicated plate:', `${plateName} (Copy)`);
      if (!newName) return;

      await apiDataService.duplicatePlate(plateId, newName);
      await loadProjects();
      
      if (selectedProject) {
        const updatedProject = await apiDataService.getProject(selectedProject.id);
        if (updatedProject) {
          setSelectedProject(updatedProject);
        }
      }
    } catch (err) {
      console.error('Failed to duplicate plate:', err);
      alert('Failed to duplicate plate');
    }
  };

  const handleDeletePlate = async (plateId: string, plateName: string) => {
    try {
      if (!confirm(`Are you sure you want to delete "${plateName}"?`)) return;

      await apiDataService.deletePlate(plateId);
      await loadProjects();
      
      if (selectedProject) {
        const updatedProject = await apiDataService.getProject(selectedProject.id);
        if (updatedProject) {
          setSelectedProject(updatedProject);
        }
      }
    } catch (err) {
      console.error('Failed to delete plate:', err);
      alert('Failed to delete plate');
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    try {
      if (!confirm(`Are you sure you want to delete "${projectName}"? This will also delete all plates in this project.`)) return;

      await apiDataService.deleteProject(projectId);
      await loadProjects();
      
      // If the deleted project was selected, clear the selection
      if (selectedProject && selectedProject.id === projectId) {
        setSelectedProject(null);
        setView('projects');
      }
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert('Failed to delete project');
    }
  };

  const ProjectsView = () => (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Assay Plate Manager</h1>
        <button
          onClick={() => setShowCreateProject(true)}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </button>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="text-lg">Loading dashboard...</div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong>Error:</strong> {error}
          <button 
            onClick={loadProjects}
            className="ml-4 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Projects Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Your Projects</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(project => (
                  <div
                    key={project.id}
                    className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
                  >
                    <div 
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedProject(project);
                        setView('plates');
                      }}
                    >
                      <h3 className="text-xl font-semibold mb-2">{project.name}</h3>
                      <p className="text-gray-600 mb-3">{project.description}</p>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>{project.plates.length} plates</span>
                      <div className="flex items-center gap-2">
                        <span>{project.last_modified.toLocaleDateString()}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project.id, project.name);
                          }}
                          className="p-1 text-red-500 hover:text-red-700"
                          title="Delete project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const PlatesView = () => (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <button
          onClick={() => setView('projects')}
          className="mr-4 text-blue-500 hover:text-blue-700"
        >
          ← Back to Projects
        </button>
        <h1 className="text-3xl font-bold">{selectedProject?.name}</h1>
      </div>

      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">{selectedProject?.description}</p>
        <button
          onClick={() => setShowCreatePlate(true)}
          className="flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Plate
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {selectedProject?.plates.map(plate => (
          <div
            key={plate.id}
            className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-xl font-semibold">{plate.name}</h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                plate.status === 'active' ? 'bg-green-100 text-green-800' :
                plate.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                plate.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {plate.status}
              </span>
            </div>
            
            <p className="text-gray-600 mb-3">{plate.description}</p>
            
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
              <span className="flex items-center">
                <User className="w-3 h-3 mr-1" />
                {plate.created_by}
              </span>
              <span className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                {plate.last_modified.toLocaleDateString()}
              </span>
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {plate.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">{plate.plate_type}-well plate</span>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      // Fetch the latest plate data to ensure we have current wells
                      const latestPlate = await apiDataService.getPlate(plate.id);
                      if (latestPlate) {
                        setSelectedPlate(latestPlate);
                        setView('editor');
                      } else {
                        alert('Plate not found');
                      }
                    } catch (error) {
                      console.error('Failed to load plate:', error);
                      alert('Failed to load plate');
                    }
                  }}
                  className="p-1 text-blue-500 hover:text-blue-700"
                  title="Edit plate"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDuplicatePlate(plate.id, plate.name)}
                  className="p-1 text-green-500 hover:text-green-700"
                  title="Duplicate plate"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeletePlate(plate.id, plate.name)}
                  className="p-1 text-red-500 hover:text-red-700"
                  title="Delete plate"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const EditorView = () => (
    <div>
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => setView('plates')}
              className="mr-4 text-blue-500 hover:text-blue-700"
            >
              ← Back to Plates
            </button>
            <div>
              <h1 className="text-2xl font-bold">{selectedPlate?.name}</h1>
              <p className="text-gray-600">{selectedPlate?.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <select
                value={selectedPlate?.status || 'draft'}
                onChange={(e) => selectedPlate && handleStatusUpdate(selectedPlate.id, e.target.value as any)}
                className="px-3 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Embed the AssayPlateDesigner component */}
      <AssayPlateDesigner 
        currentPlate={selectedPlate}
        onPlateUpdate={handlePlateUpdate}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {view === 'projects' && <ProjectsView />}
      {view === 'plates' && <PlatesView />}
      {view === 'editor' && <EditorView />}
      
      <CreateProjectModal
        show={showCreateProject}
        projectForm={projectForm}
        onClose={handleCloseProjectModal}
        onCreate={handleCreateProject}
        onNameChange={handleProjectNameChange}
        onDescriptionChange={handleProjectDescriptionChange}
      />
      
      <CreatePlateModal
        show={showCreatePlate}
        plateForm={plateForm}
        onClose={handleClosePlateModal}
        onCreate={handleCreatePlate}
        onNameChange={handlePlateNameChange}
        onDescriptionChange={handlePlateDescriptionChange}
        onTypeChange={handlePlateTypeChange}
        onTagsChange={handlePlateTagsChange}
      />
    </div>
  );
};

export default AssayPlateManager;
