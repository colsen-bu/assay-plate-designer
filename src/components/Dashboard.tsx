"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FileText, Search, BarChart3, LogOut, User } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useUser, useClerk } from '@clerk/nextjs';
import AssayPlateManager from './AssayPlateManager';
import { apiDataService, ProjectWithPlates, Plate } from '../lib/apiDataService';

const Dashboard = () => {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [activeTab, setActiveTab] = useState<'plates' | 'reports'>('plates');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    projects: ProjectWithPlates[];
    plates: any[];
  }>({ projects: [], plates: [] });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Utility function to display user name properly
  const displayUserName = (created_by: string) => {
    if (created_by.startsWith('user_')) {
      // This is a Clerk user ID, show the current user's display name
      return user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Unknown User';
    }
    // This is already a display name
    return created_by;
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setShowSearchResults(false);
      return;
    }

    try {
      const projects = await apiDataService.getProjects();
      
      // Search projects
      const matchingProjects = projects.filter(project =>
        project.name.toLowerCase().includes(query.toLowerCase()) ||
        project.description?.toLowerCase().includes(query.toLowerCase())
      );

      // Search plates across all projects
      const matchingPlates: any[] = [];
      projects.forEach(project => {
        project.plates.forEach(plate => {
          const displayName = displayUserName(plate.created_by);
          if (
            plate.name.toLowerCase().includes(query.toLowerCase()) ||
            plate.description?.toLowerCase().includes(query.toLowerCase()) ||
            plate.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())) ||
            displayName.toLowerCase().includes(query.toLowerCase())
          ) {
            matchingPlates.push({
              ...plate,
              projectName: project.name,
              projectId: project.id,
              displayCreatedBy: displayName
            });
          }
        });
      });

      setSearchResults({ projects: matchingProjects, plates: matchingPlates });
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const ReportsTab = () => {
    const [projects, setProjects] = useState<ProjectWithPlates[]>([]);
    const [selectedProject, setSelectedProject] = useState<string>('all');
    const [dateRange, setDateRange] = useState<'30d' | '90d' | '180d' | '1y' | 'all'>('90d');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const loadProjects = async () => {
        setLoading(true);
        try {
          const projectsData = await apiDataService.getProjects();
          setProjects(projectsData);
        } catch (error) {
          console.error('Failed to load projects:', error);
        } finally {
          setLoading(false);
        }
      };

      loadProjects();
    }, []);

    const updatePlateStatus = async (plateId: string, newStatus: 'draft' | 'active' | 'completed' | 'archived') => {
      try {
        await apiDataService.updatePlate(plateId, { status: newStatus });
        // Reload projects to reflect the change
        const projectsData = await apiDataService.getProjects();
        setProjects(projectsData);
      } catch (error) {
        console.error('Failed to update plate status:', error);
      }
    };

    const filteredPlates = useMemo(() => {
      let allPlates: (Plate & { projectName: string })[] = [];

      // Collect all plates from all projects
      projects.forEach(project => {
        project.plates.forEach(plate => {
          allPlates.push({
            ...plate,
            projectName: project.name
          });
        });
      });

      // Filter by project
      if (selectedProject !== 'all') {
        allPlates = allPlates.filter(plate => plate.project_id === selectedProject);
      }

      // Filter by date range
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (dateRange) {
        case '30d':
          cutoffDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          cutoffDate.setDate(now.getDate() - 90);
          break;
        case '180d':
          cutoffDate.setDate(now.getDate() - 180);
          break;
        case '1y':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
        default:
          cutoffDate.setFullYear(2000);
          break;
      }

      if (dateRange !== 'all') {
        allPlates = allPlates.filter(plate => plate.created_at >= cutoffDate);
      }

      return allPlates;
    }, [projects, selectedProject, dateRange]);

    const stats = useMemo(() => {
      const totalPlates = filteredPlates.length;
      const draftCount = filteredPlates.filter(p => p.status === 'draft').length;
      const activeCount = filteredPlates.filter(p => p.status === 'active').length;
      const completedCount = filteredPlates.filter(p => p.status === 'completed').length;
      const archivedCount = filteredPlates.filter(p => p.status === 'archived').length;

      return {
        totalPlates,
        draftCount,
        activeCount,
        completedCount,
        archivedCount
      };
    }, [filteredPlates]);

    const chartData = [
      { name: 'Draft', value: stats.draftCount, fill: '#fbbf24' },
      { name: 'Active', value: stats.activeCount, fill: '#10b981' },
      { name: 'Completed', value: stats.completedCount, fill: '#3b82f6' },
      { name: 'Archived', value: stats.archivedCount, fill: '#6b7280' }
    ];

    const timelineData = useMemo(() => {
      if (filteredPlates.length === 0) {
        return [];
      }

      // Get today's date at start of day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate start date based on the selected filter
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      
      switch (dateRange) {
        case '30d':
          startDate.setDate(today.getDate() - 29); // Include today
          break;
        case '90d':
          startDate.setDate(today.getDate() - 89); // Include today
          break;
        case '180d':
          startDate.setDate(today.getDate() - 179); // Include today
          break;
        case '1y':
          startDate.setDate(today.getDate() - 364); // Include today
          break;
        case 'all':
        default:
          // For 'all', find the earliest plate creation date
          if (filteredPlates.length > 0) {
            const earliestPlate = filteredPlates.reduce((earliest, plate) => 
              plate.created_at < earliest ? plate.created_at : earliest, 
              filteredPlates[0].created_at
            );
            startDate.setTime(earliestPlate.getTime());
            startDate.setHours(0, 0, 0, 0);
          } else {
            startDate.setDate(today.getDate() - 29); // fallback
          }
          break;
      }

      // Generate array of dates from start to today (inclusive)
      const dateArray: string[] = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= today) {
        dateArray.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Limit data points for performance (but ensure we include today)
      let finalDateArray = dateArray;
      if (dateArray.length > 365 && dateRange === 'all') {
        // For 'all' with too many points, sample but always include today
        const step = Math.ceil(dateArray.length / 365);
        finalDateArray = dateArray.filter((_, index) => 
          index % step === 0 || dateArray[index] === today.toISOString().split('T')[0]
        );
      }

      // Create timeline data with proper date handling
      return finalDateArray.map(dateStr => {
        const platesOnDate = filteredPlates.filter(plate => {
          const plateDate = new Date(plate.created_at);
          plateDate.setHours(0, 0, 0, 0);
          return plateDate.toISOString().split('T')[0] === dateStr;
        });
        
        return {
          date: dateStr,
          created: platesOnDate.length,
          draft: platesOnDate.filter(p => p.status === 'draft').length,
          active: platesOnDate.filter(p => p.status === 'active').length,
          completed: platesOnDate.filter(p => p.status === 'completed').length
        };
      });
    }, [filteredPlates, dateRange]);

    if (loading) {
      return (
        <div className="p-6 flex items-center justify-center">
          <div className="text-gray-500">Loading plate data...</div>
        </div>
      );
    }

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Plate Status Analytics</h1>
          <div className="flex items-center space-x-4">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="180d">Last 180 days</option>
              <option value="1y">Last year</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-600">{stats.totalPlates}</div>
            <div className="text-gray-500">Total Plates</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-yellow-600">{stats.draftCount}</div>
            <div className="text-gray-500">Draft</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{stats.activeCount}</div>
            <div className="text-gray-500">Active</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{stats.completedCount}</div>
            <div className="text-gray-500">Completed</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-600">{stats.archivedCount}</div>
            <div className="text-gray-500">Archived</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution Pie Chart */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Status Distribution</h2>
            </div>
            <div className="p-6">
              {chartData.some(item => item.value > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.filter(item => item.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => 
                        `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No plates found
                </div>
              )}
            </div>
          </div>

          {/* Timeline Chart */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Plate Creation Timeline</h2>
              <p className="text-sm text-gray-500 mt-1">
                Showing {timelineData.length} data points • Today: {new Date().toLocaleDateString()}
              </p>
            </div>
            <div className="p-6">
              {timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart 
                    data={timelineData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => {
                        try {
                          const date = new Date(value + 'T00:00:00');
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          
                          // Check if this is today
                          const isToday = date.getTime() === today.getTime();
                          
                          let formattedDate;
                          if (dateRange === '30d' || dateRange === '90d') {
                            formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                          } else if (dateRange === '180d' || dateRange === '1y') {
                            formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                          } else {
                            formattedDate = date.toLocaleDateString(undefined, { year: '2-digit', month: 'short' });
                          }
                          
                          return isToday ? `${formattedDate} (Today)` : formattedDate;
                        } catch (error) {
                          console.error('Error formatting tick:', value, error);
                          return value;
                        }
                      }}
                      tick={{ fontSize: 11 }}
                      interval={
                        dateRange === '30d' ? Math.ceil(timelineData.length / 8) :
                        dateRange === '90d' ? Math.ceil(timelineData.length / 10) :
                        dateRange === '180d' ? Math.ceil(timelineData.length / 12) :
                        dateRange === '1y' ? Math.ceil(timelineData.length / 15) :
                        Math.ceil(timelineData.length / 20)
                      }
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Plates Created', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      labelFormatter={(value) => {
                        try {
                          const date = new Date(value + 'T00:00:00');
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          
                          const isToday = date.getTime() === today.getTime();
                          const formattedDate = date.toLocaleDateString(undefined, {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          });
                          
                          return isToday ? `${formattedDate} (Today)` : formattedDate;
                        } catch (error) {
                          console.error('Error formatting tooltip:', value, error);
                          return value;
                        }
                      }}
                      formatter={(value, name) => [value, 'Plates Created']}
                      contentStyle={{
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #dee2e6',
                        borderRadius: '4px'
                      }}
                    />
                    <Bar 
                      dataKey="created" 
                      fill="#3b82f6"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-lg mb-2">No data available</div>
                  <div className="text-sm">
                    No plate creation data found for the selected date range ({dateRange})
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Plate Status Management Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Plate Status Management</h2>
            <p className="text-sm text-gray-500 mt-1">
              View and update the status of your plates
            </p>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Plate Name</th>
                    <th className="text-left p-3 font-medium">Project</th>
                    <th className="text-left p-3 font-medium">Created By</th>
                    <th className="text-left p-3 font-medium">Created</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlates.map((plate) => (
                    <tr key={plate.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium">{plate.name}</div>
                        {plate.description && (
                          <div className="text-sm text-gray-500">{plate.description}</div>
                        )}
                      </td>
                      <td className="p-3 text-gray-600">{plate.projectName}</td>
                      <td className="p-3 text-gray-600">{displayUserName(plate.created_by)}</td>
                      <td className="p-3 text-gray-600">
                        {plate.created_at.toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          plate.status === 'active' ? 'bg-green-100 text-green-800' :
                          plate.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          plate.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {plate.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <select
                          value={plate.status}
                          onChange={(e) => updatePlateStatus(plate.id, e.target.value as any)}
                          className="px-2 py-1 border rounded text-sm"
                        >
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                          <option value="completed">Completed</option>
                          <option value="archived">Archived</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPlates.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No plates found for the selected filters
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Show loading while user is being fetched
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // If not authenticated, this shouldn't happen due to middleware
  // but we'll add a fallback just in case
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Please sign in to access this application.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <h1 className="text-2xl font-bold text-gray-900">Assay Plate Manager</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative" ref={searchRef}>
                <div className="flex items-center">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3" />
                  <input
                    type="text"
                    placeholder="Search projects and plates..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                  />
                </div>
                
                {/* Search Results Dropdown */}
                {showSearchResults && (searchResults.projects.length > 0 || searchResults.plates.length > 0) && (
                  <div className="absolute top-full mt-1 w-full bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    {searchResults.projects.length > 0 && (
                      <div>
                        <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50">
                          Projects ({searchResults.projects.length})
                        </div>
                        {searchResults.projects.map((project) => (
                          <div
                            key={project.id}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                            onClick={() => {
                              setActiveTab('plates');
                              setShowSearchResults(false);
                              setSearchQuery('');
                            }}
                          >
                            <div className="font-medium text-gray-900">{project.name}</div>
                            <div className="text-sm text-gray-500">{project.plates.length} plates</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {searchResults.plates.length > 0 && (
                      <div>
                        <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50">
                          Plates ({searchResults.plates.length})
                        </div>
                        {searchResults.plates.map((plate) => (
                          <div
                            key={plate.id}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                            onClick={() => {
                              setActiveTab('plates');
                              setShowSearchResults(false);
                              setSearchQuery('');
                            }}
                          >
                            <div className="font-medium text-gray-900">{plate.name}</div>
                            <div className="text-sm text-gray-500">
                              {plate.projectName} • Created by {plate.displayCreatedBy}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100"
                >
                  {user?.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt={user.fullName || 'User'}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                      {user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0] || 'U'}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {user?.fullName || user?.emailAddresses?.[0]?.emailAddress}
                  </span>
                </button>

                {/* User Menu Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      <div className="font-medium">{user?.fullName}</div>
                      <div className="text-gray-500">{user?.emailAddresses?.[0]?.emailAddress}</div>
                    </div>
                    <button
                      onClick={() => signOut()}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('plates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'plates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Plate Manager
            </button>
            
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Status Analytics
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {activeTab === 'plates' && <AssayPlateManager />}
        {activeTab === 'reports' && <ReportsTab />}
      </main>
    </div>
  );
};

export default Dashboard;
