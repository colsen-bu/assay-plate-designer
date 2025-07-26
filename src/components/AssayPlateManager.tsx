"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit, Edit2, Trash2, Copy, Calendar, User, FileText } from 'lucide-react';
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

const GenerateFromTemplateModal = ({ 
  show, 
  onClose, 
  projectId,
  onGenerate
}: {
  show: boolean;
  onClose: () => void;
  projectId: string | null;
  onGenerate: (templateId: string, compounds: string[], prefix: string) => void;
}) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [compounds, setCompounds] = useState<string[]>([]);
  const [plateNamePrefix, setPlateNamePrefix] = useState('Generated Plate');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate estimated plates based on template and compounds
  const getEstimatedPlates = () => {
    if (!selectedTemplate || compounds.length === 0) return 0;
    
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return 0;
    
    const concentrations = template.dosing_parameters?.concentrations || [10, 1, 0.1, 0.01];
    const replicates = template.dosing_parameters?.replicates || 3;
    const wellsPerCompound = concentrations.length * replicates;
    
    // Simple estimation: assume 60% of wells are available (rough estimate)
    const estimatedAvailableWells = Math.floor(template.plate_type * 0.6);
    const compoundsPerPlate = Math.floor(estimatedAvailableWells / wellsPerCompound);
    
    if (compoundsPerPlate === 0) return compounds.length; // Fallback if calculation fails
    
    return Math.ceil(compounds.length / compoundsPerPlate);
  };

  useEffect(() => {
    if (show) {
      loadTemplates();
    }
  }, [show]);

  const loadTemplates = async () => {
    try {
      const templatesData = await apiDataService.getPlateTemplates();
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      parseCSV(file);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header row, extract compound names
      const compoundNames = lines.slice(1)
        .map(line => line.split(',')[0]?.trim())
        .filter(name => name && name.length > 0);
      
      setCompounds(compoundNames);
    };
    reader.readAsText(file);
  };

  const handleGenerate = () => {
    if (!selectedTemplate) {
      alert('Please select a template');
      return;
    }
    if (compounds.length === 0) {
      alert('Please upload a CSV file with compounds');
      return;
    }
    
    onGenerate(selectedTemplate, compounds, plateNamePrefix);
    onClose();
  };

  const resetForm = () => {
    setSelectedTemplate('');
    setCsvFile(null);
    setCompounds([]);
    setPlateNamePrefix('Generated Plate');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Generate Plates from Template</h2>
        
        <div className="space-y-4">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Select Template</label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Choose a template...</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.plate_type}-well)
                </option>
              ))}
            </select>
          </div>

          {/* CSV Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Upload Compounds CSV</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="w-full p-2 border rounded"
            />
            <p className="text-xs text-gray-500 mt-1">
              CSV should have a "Compound" column header
            </p>
          </div>

          {/* Plate Name Prefix */}
          <div>
            <label className="block text-sm font-medium mb-2">Plate Name Prefix</label>
            <input
              type="text"
              value={plateNamePrefix}
              onChange={(e) => setPlateNamePrefix(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Generated Plate"
            />
          </div>

          {/* Preview */}
          {compounds.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Preview ({compounds.length} compounds)
              </label>
              <div className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-sm">
                {compounds.slice(0, 10).map((compound, index) => (
                  <div key={index}>{compound}</div>
                ))}
                {compounds.length > 10 && <div>... and {compounds.length - 10} more</div>}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!selectedTemplate || compounds.length === 0}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate Plates ({compounds.length} compounds)
          </button>
        </div>
      </div>
    </div>
  );
};

const EditTemplateModal = ({ 
  show, 
  onClose, 
  template, 
  onUpdate,
  onAutoSave
}: { 
  show: boolean; 
  onClose: () => void; 
  template: any | null; 
  onUpdate: (id: string, name: string, description: string, templateWells?: any, plateType?: number) => void;
  onAutoSave: (id: string, wells: any, plateType?: number) => void;
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currentView, setCurrentView] = useState<'info' | 'wells'>('info');
  const [localTemplate, setLocalTemplate] = useState<any>(null);

  React.useEffect(() => {
    if (template) {
      setName(template.name || '');
      setDescription(template.description || '');
      setLocalTemplate(template);
    }
  }, [template]);

  const handleUpdate = () => {
    if (localTemplate && name.trim()) {
      onUpdate(localTemplate.id, name.trim(), description.trim(), localTemplate.template_wells, localTemplate.plate_type);
      onClose();
    }
  };

  const handleWellsUpdate = (plateId: string, wells: any, plateType?: number) => {
    if (localTemplate) {
      // Update local template state immediately for UI responsiveness
      setLocalTemplate((prev: any) => ({
        ...prev,
        template_wells: wells,
        ...(plateType && { plate_type: plateType })
      }));
      
      // Auto-save changes without closing modal
      onAutoSave(localTemplate.id, wells, plateType);
    }
  };

  if (!show || !template) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gray-50 flex-shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Edit Template</h2>
            <div className="flex items-center gap-4">
              <div className="flex bg-gray-200 rounded">
                <button
                  onClick={() => setCurrentView('info')}
                  className={`px-4 py-2 rounded text-sm font-medium ${
                    currentView === 'info' 
                      ? 'bg-blue-500 text-white' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Template Info
                </button>
                <button
                  onClick={() => setCurrentView('wells')}
                  className={`px-4 py-2 rounded text-sm font-medium ${
                    currentView === 'wells' 
                      ? 'bg-blue-500 text-white' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Edit Wells
                </button>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {currentView === 'info' ? (
            <div className="p-6 h-full overflow-auto">
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter template name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Enter template description"
                  />
                </div>

                <div className="pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Template Details</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Plate Type: {localTemplate?.plate_type}-well</div>
                    <div>Created: {localTemplate && new Date(localTemplate.created_at).toLocaleDateString()}</div>
                    {localTemplate?.tags && <div>Tags: {localTemplate.tags}</div>}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex-shrink-0">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Edit Template Wells</h3>
                <p className="text-sm text-gray-600">
                  Modify the well layout for this template. Control wells and specific compounds will be preserved, 
                  while sample compounds will be replaced with placeholders when the template is used.
                </p>
              </div>
              <div className="flex-1 overflow-auto">
                <AssayPlateDesigner
                  currentPlate={localTemplate ? {
                    id: localTemplate.id,
                    name: localTemplate.name,
                    description: localTemplate.description,
                    plate_type: localTemplate.plate_type,
                    wells: localTemplate.template_wells || {},
                    status: 'draft',
                    tags: localTemplate.tags,
                    created_at: new Date(localTemplate.created_at),
                    last_modified: new Date(localTemplate.updated_at || localTemplate.created_at),
                    project_id: '',
                    created_by: ''
                  } : null}
                  onPlateUpdate={handleWellsUpdate}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex-shrink-0">
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={!name.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Update Template
            </button>
          </div>
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
  const [view, setView] = useState<'projects' | 'plates' | 'editor' | 'templates'>('projects');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreatePlate, setShowCreatePlate] = useState(false);
  const [showGenerateFromTemplate, setShowGenerateFromTemplate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Template management state
  const [userTemplates, setUserTemplates] = useState<any[]>([]);
  const [showEditTemplate, setShowEditTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  // Early return if not loaded or not signed in
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading user...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Please sign in to access this application.</div>
      </div>
    );
  }

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
    if (isLoaded && isSignedIn) {
      loadProjects();
    }
  }, [isLoaded, isSignedIn]);

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
    if (!isLoaded || !isSignedIn) {
      console.log('User not loaded or not signed in, skipping loadProjects');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Loading projects for user:', user?.id);
      const projectsData = await apiDataService.getProjects();
      setProjects(projectsData);
      
    } catch (err) {
      console.error('Failed to load projects:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load projects';
      setError(errorMessage);
      
      // If authentication error, redirect to sign in
      if (errorMessage.includes('Authentication required')) {
        window.location.href = '/sign-in';
      }
    } finally {
      setLoading(false);
    }
  };

    const handlePlateUpdate = async (plateId: string, wells: Record<string, any>, plateType?: number) => {
    try {
      const updateData: any = { wells };
      if (plateType !== undefined) {
        updateData.plate_type = plateType;
      }
      
      await apiDataService.updatePlate(plateId, updateData);
      
      // Update the local state to reflect the changes
      setProjects(prevProjects => 
        prevProjects.map(project => ({
          ...project,
          plates: project.plates.map(plate => 
            plate.id === plateId 
              ? { 
                  ...plate, 
                  wells, 
                  ...(plateType !== undefined && { plate_type: plateType }),
                  last_modified: new Date() 
                }
              : plate
          )
        }))
      );

      // Update selectedPlate if it's the one being updated
      if (selectedPlate?.id === plateId) {
        setSelectedPlate(prev => prev ? { 
          ...prev, 
          wells, 
          ...(plateType !== undefined && { plate_type: plateType }),
          last_modified: new Date() 
        } : null);
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

      const newProject = await apiDataService.createProject({
        name: projectForm.name,
        description: projectForm.description || undefined
      });

      setProjectForm({ name: '', description: '' });
      setShowCreateProject(false);
      await loadProjects();
      
      // Navigate to the newly created project
      if (newProject) {
        const projectWithPlates = await apiDataService.getProject(newProject.id);
        if (projectWithPlates) {
          setSelectedProject(projectWithPlates);
          setView('plates');
        }
      }
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

      const newPlate = await apiDataService.createPlate(selectedProject.id, plateData);

      setPlateForm({
        name: '',
        description: '',
        plate_type: 0,
        tags: '',
        created_by: user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Unknown User'
      });
      setShowCreatePlate(false);
      await loadProjects();
      
      // Update selected project and navigate to the new plate
      const updatedProject = await apiDataService.getProject(selectedProject.id);
      if (updatedProject) {
        setSelectedProject(updatedProject);
        
        // Navigate directly to the editor with the new plate
        if (newPlate) {
          const fullPlateData = await apiDataService.getPlate(newPlate.id);
          if (fullPlateData) {
            setSelectedPlate(fullPlateData);
            setView('editor');
          }
        }
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

  const handleGenerateFromTemplate = async (templateId: string, compounds: string[], prefix: string) => {
    if (!selectedProject) {
      alert('No project selected');
      return;
    }

    try {
      setLoading(true);
      const result = await apiDataService.generatePlatesFromTemplate(templateId, {
        project_id: selectedProject.id,
        compounds,
        plate_name_prefix: prefix
      });

      alert(`Successfully generated ${result.count} plates!`);
      
      // Reload the project to show new plates
      await loadProjects();
      const updatedProject = await apiDataService.getProject(selectedProject.id);
      if (updatedProject) {
        setSelectedProject(updatedProject);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Failed to generate plates:', errorMessage);
      alert('Failed to generate plates from template');
    } finally {
      setLoading(false);
    }
  };

  // Template management functions
  const loadUserTemplates = async () => {
    try {
      const templates = await apiDataService.getPlateTemplates();
      setUserTemplates(templates);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setShowEditTemplate(true);
  };

  const handleAutoSaveTemplate = async (templateId: string, wells: any, plateType?: number) => {
    try {
      const updatedData: any = { template_wells: wells };
      if (plateType) {
        updatedData.plate_type = plateType;
      }
      
      await apiDataService.updatePlateTemplate(templateId, updatedData);
      // Silently update the templates list in the background
      await loadUserTemplates();
    } catch (err) {
      console.error('Failed to auto-save template changes:', err);
    }
  };

  const handleUpdateTemplate = async (templateId: string, name: string, description: string, templateWells?: any, plateType?: number) => {
    try {
      const updatedData: any = { name, description };
      if (templateWells) {
        updatedData.template_wells = templateWells;
      }
      if (plateType) {
        updatedData.plate_type = plateType;
      }
      
      await apiDataService.updatePlateTemplate(templateId, updatedData);
      await loadUserTemplates();
      setShowEditTemplate(false);
      setEditingTemplate(null);
      alert('Template updated successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Failed to update template:', errorMessage);
      alert('Failed to update template');
    }
  };

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Are you sure you want to delete the template "${templateName}"?`)) return;
    
    try {
      await apiDataService.deletePlateTemplate(templateId);
      await loadUserTemplates();
      alert('Template deleted successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Failed to delete template:', errorMessage);
      alert('Failed to delete template');
    }
  };

  // Load templates when switching to templates view
  useEffect(() => {
    if (view === 'templates') {
      loadUserTemplates();
    }
  }, [view]);

  const ProjectsView = () => (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Assay Plate Manager</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView('templates')}
            className="flex items-center px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            <FileText className="w-4 h-4 mr-2" />
            Manage Templates
          </button>
          <button
            onClick={() => setShowCreateProject(true)}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </button>
        </div>
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
        <div className="flex gap-2">
          <button
            onClick={() => setShowGenerateFromTemplate(true)}
            className="flex items-center px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            <FileText className="w-4 h-4 mr-2" />
            Generate from Template
          </button>
          <button
            onClick={() => setShowCreatePlate(true)}
            className="flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Plate
          </button>
        </div>
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
                {plate.created_by.startsWith('user_') ? 
                  (user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Unknown User') : 
                  plate.created_by
                }
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

  const TemplatesView = () => (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <button
          onClick={() => setView('projects')}
          className="mr-4 text-blue-500 hover:text-blue-700"
        >
          ← Back to Projects
        </button>
        <h1 className="text-3xl font-bold">Manage Templates</h1>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="text-lg">Loading templates...</div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong>Error:</strong> {error}
          <button 
            onClick={loadUserTemplates}
            className="ml-4 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Your Templates</h2>
          </div>
          <div className="p-6">
            {userTemplates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                <p className="text-gray-600 mb-4">Create your first template by designing a plate and saving it as a template.</p>
                <button
                  onClick={() => setView('projects')}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Go to Projects
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userTemplates.map(template => (
                  <div
                    key={template.id}
                    className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
                  >
                    <div className="mb-3">
                      <h3 className="text-xl font-semibold mb-2">{template.name}</h3>
                      <p className="text-gray-600 mb-3">{template.description}</p>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex justify-between">
                        <span>Plate Type:</span>
                        <span className="capitalize">{template.plate_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tags:</span>
                        <span>{template.tags || 'None'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Created:</span>
                        <span>{new Date(template.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="flex items-center px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id, template.name)}
                        className="flex items-center px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {view === 'projects' && <ProjectsView />}
      {view === 'plates' && <PlatesView />}
      {view === 'editor' && <EditorView />}
      {view === 'templates' && <TemplatesView />}
      
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

      <GenerateFromTemplateModal
        show={showGenerateFromTemplate}
        onClose={() => setShowGenerateFromTemplate(false)}
        projectId={selectedProject?.id || null}
        onGenerate={handleGenerateFromTemplate}
      />

      <EditTemplateModal
        show={showEditTemplate}
        onClose={() => setShowEditTemplate(false)}
        template={editingTemplate}
        onUpdate={handleUpdateTemplate}
        onAutoSave={handleAutoSaveTemplate}
      />
    </div>
  );
};

export default AssayPlateManager;
