# Assay Plate Manager

A comprehensive system for managing laboratory assay plates with an integrated plate editor. This application provides a full workflow for creating, organizing, and editing assay plate configurations.

## System Architecture

### Components Structure

```
src/
├── components/
│   ├── AssayPlateDesigner.tsx    # Original plate editor (embedded)
│   ├── AssayPlateManager.tsx     # Project and plate management
│   ├── Dashboard.tsx             # Main dashboard with tabs
│   └── ui/                       # Reusable UI components
├── contexts/
│   └── DataContext.tsx           # Data management context
├── services/
│   └── dataService.ts            # Data service abstraction layer
└── app/
    └── page.tsx                  # Main entry point
```

## Features

### 1. Dashboard Overview
- **Stats Cards**: Total projects, plates, active assays, completed assays
- **Recent Activity**: Track changes and updates
- **Quick Navigation**: Access to different sections

### 2. Project Management
- **Create Projects**: Organize plates into projects
- **Project List**: View all projects with metadata
- **Project Details**: Description, collaborators, settings

### 3. Plate Management
- **Create Plates**: Multiple plate formats (6, 12, 24, 48, 96, 384-well)
- **Plate Organization**: Tags, status tracking, metadata
- **Plate Operations**: Edit, duplicate, delete, export
- **Status Tracking**: Draft → Active → Completed → Archived

### 4. Integrated Plate Editor
- **Visual Editor**: The original AssayPlateDesigner embedded
- **Well Management**: Compounds, concentrations, cell types
- **Selection Tools**: Keyboard shortcuts, drag selection
- **Export Options**: CSV export, data backup

### 5. Data Management
- **Abstraction Layer**: Pluggable data services
- **Local Storage**: Development/demo mode
- **Database Ready**: Production-ready architecture
- **Context Management**: React context for state management

## Data Models

### Project
```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  plates: AssayPlate[];
  createdAt: Date;
  lastModified: Date;
  collaborators?: string[];
  settings?: ProjectSettings;
}
```

### AssayPlate
```typescript
interface AssayPlate {
  id: string;
  name: string;
  plateType: number; // 6, 12, 24, 48, 96, 384
  description?: string;
  createdBy: string;
  createdAt: Date;
  lastModified: Date;
  tags: string[];
  status: 'draft' | 'active' | 'completed' | 'archived';
  wells: { [key: string]: Well };
  metadata?: PlateMetadata;
}
```

### Well
```typescript
interface Well {
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
```

## Navigation Flow

1. **Dashboard** → Overview of system activity
2. **Plate Manager Tab** → Project management view
3. **Select Project** → View plates within project
4. **Edit Plate** → Opens integrated plate editor
5. **Back Navigation** → Return to project/dashboard

## Data Service Architecture

### Abstract Base Class
```typescript
abstract class DataService {
  // Project operations
  abstract getProjects(): Promise<Project[]>;
  abstract createProject(project: ProjectData): Promise<Project>;
  abstract updateProject(id: string, updates: Partial<Project>): Promise<Project>;
  
  // Plate operations
  abstract getPlates(projectId: string): Promise<AssayPlate[]>;
  abstract createPlate(projectId: string, plate: PlateData): Promise<AssayPlate>;
  abstract updatePlate(plateId: string, updates: Partial<AssayPlate>): Promise<AssayPlate>;
  
  // Well operations
  abstract updateWells(plateId: string, wells: WellData): Promise<void>;
  
  // Search and export
  abstract searchPlates(query: string, filters?: PlateFilters): Promise<AssayPlate[]>;
  abstract exportPlateToCSV(plateId: string): Promise<string>;
}
```

### Implementations
- **LocalStorageDataService**: Browser localStorage (development/demo)
- **DatabaseDataService**: REST API backend (production)

## Context Management

### DataProvider
- Manages global application state
- Provides data service abstraction
- Handles loading states and error management
- Provides hooks for specific operations

### Custom Hooks
- `useData()`: Access to global data context
- `useProjects()`: Project CRUD operations
- `usePlates()`: Plate management within projects
- `useUser()`: User preferences and settings

## Integration Points

### Existing AssayPlateDesigner
The original `AssayPlateDesigner` component is embedded without modifications:
- Maintains all existing functionality
- Preserves keyboard shortcuts and interactions
- Keeps titration calculator integration
- Retains undo/redo functionality

### Data Flow
1. Dashboard → Project selection → Plate selection
2. Plate editor receives plate data through props
3. Changes saved through DataContext to DataService
4. Real-time updates across components

## Setup Instructions

### Development Mode
```typescript
// Uses localStorage for data persistence
<DataProvider serviceType="localStorage">
  <Dashboard />
</DataProvider>
```

### Production Mode
```typescript
// Uses REST API backend
<DataProvider 
  serviceType="database" 
  config={{ apiBaseUrl: '/api' }}
>
  <Dashboard />
</DataProvider>
```

## Extension Points

### 1. Additional Data Services
- Implement `DataService` abstract class
- Add to factory function in `createDataService()`

### 2. New Plate Operations
- Add methods to `DataService` base class
- Implement in both localStorage and database services
- Add UI components for new operations

### 3. Advanced Analytics
- Reports tab ready for charts and analytics
- Export system extensible for different formats
- Search and filtering system expandable

### 4. User Management
- User roles and permissions framework
- Collaboration features (sharing, commenting)
- Audit trail and change history

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **State Management**: React Context, Custom Hooks
- **Icons**: Lucide React
- **Storage**: localStorage (dev), REST API (prod)
- **Build**: Next.js

## Future Enhancements

1. **Real-time Collaboration**: WebSocket integration
2. **Advanced Search**: Full-text search, filters
3. **Batch Operations**: Multi-plate operations
4. **Templates**: Plate templates and presets
5. **Integration**: LIMS integration, laboratory equipment
6. **Mobile Support**: Responsive design improvements
7. **Offline Support**: PWA capabilities
8. **Advanced Analytics**: Usage patterns, success metrics
