// Utility functions for the Assay Plate Manager

import { AssayPlate, Well } from '../services/dataService';

// Generate unique IDs
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Date formatting utilities
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

export const formatDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// Plate utilities
export const getPlateWellCount = (plateType: number): number => {
  return plateType;
};

export const getPlateRowsAndCols = (plateType: number): { rows: number; cols: number } => {
  const configs = {
    6: { rows: 2, cols: 3 },
    12: { rows: 3, cols: 4 },
    24: { rows: 4, cols: 6 },
    48: { rows: 6, cols: 8 },
    96: { rows: 8, cols: 12 },
    384: { rows: 16, cols: 24 }
  };
  
  return configs[plateType as keyof typeof configs] || { rows: 8, cols: 12 };
};

// Well utilities
export const getWellId = (row: number, col: number): string => {
  return `${String.fromCharCode(65 + row)}${col + 1}`;
};

export const parseWellId = (wellId: string): { row: number; col: number } => {
  const row = wellId.charCodeAt(0) - 65;
  const col = parseInt(wellId.slice(1)) - 1;
  return { row, col };
};

export const getWellsInRange = (startWell: string, endWell: string): string[] => {
  const start = parseWellId(startWell);
  const end = parseWellId(endWell);
  
  const wells: string[] = [];
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);
  
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      wells.push(getWellId(row, col));
    }
  }
  
  return wells;
};

// Data validation
export const validatePlateData = (plate: Partial<AssayPlate>): string[] => {
  const errors: string[] = [];
  
  if (!plate.name || plate.name.trim().length === 0) {
    errors.push('Plate name is required');
  }
  
  if (!plate.plateType || ![6, 12, 24, 48, 96, 384].includes(plate.plateType)) {
    errors.push('Valid plate type is required');
  }
  
  if (plate.name && plate.name.length > 100) {
    errors.push('Plate name must be less than 100 characters');
  }
  
  if (plate.description && plate.description.length > 500) {
    errors.push('Description must be less than 500 characters');
  }
  
  return errors;
};

export const validateWellData = (well: Well): string[] => {
  const errors: string[] = [];
  
  if (well.concentration && well.concentration.trim().length > 0) {
    // Check if concentration is a valid number
    if (isNaN(parseFloat(well.concentration))) {
      errors.push('Concentration must be a valid number');
    }
  }
  
  if (well.volume && well.volume <= 0) {
    errors.push('Volume must be greater than 0');
  }
  
  if (well.dilutionStep && well.dilutionStep < 1) {
    errors.push('Dilution step must be 1 or greater');
  }
  
  if (well.replicate && well.replicate < 1) {
    errors.push('Replicate number must be 1 or greater');
  }
  
  return errors;
};

// Export utilities
export const generateCSVFromPlate = (plate: AssayPlate): string => {
  const { rows, cols } = getPlateRowsAndCols(plate.plateType);
  
  let csv = 'Well,Cell Type,Compound,Concentration,Concentration Units,Volume,Notes\\n';
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const wellId = getWellId(row, col);
      const well = plate.wells[wellId] || {};
      
      const csvRow = [
        wellId,
        well.cellType || '',
        well.compound || '',
        well.concentration || '',
        well.concentrationUnits || '',
        well.volume || '',
        well.notes || ''
      ].map(field => `"${field}"`).join(',');
      
      csv += csvRow + '\\n';
    }
  }
  
  return csv;
};

export const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Search utilities
export const searchInText = (text: string, query: string): boolean => {
  if (!text || !query) return false;
  return text.toLowerCase().includes(query.toLowerCase());
};

export const filterPlatesByQuery = (plates: AssayPlate[], query: string): AssayPlate[] => {
  if (!query.trim()) return plates;
  
  return plates.filter(plate => 
    searchInText(plate.name, query) ||
    searchInText(plate.description || '', query) ||
    plate.tags.some(tag => searchInText(tag, query)) ||
    searchInText(plate.createdBy, query)
  );
};

// Color utilities for compounds
export const getCompoundColor = (compound: string): string => {
  if (!compound) return 'transparent';
  
  // Basic hash function to generate a number from a string
  const hash = compound.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  // Generate HSL color with consistent saturation and lightness
  const hue = Math.abs(hash % 360);
  return `hsla(${hue}, 70%, 85%, 0.8)`;
};

// Status utilities
export const getStatusColor = (status: AssayPlate['status']): string => {
  const colors = {
    draft: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    archived: 'bg-gray-100 text-gray-800'
  };
  
  return colors[status] || colors.draft;
};

export const getStatusIcon = (status: AssayPlate['status']): string => {
  const icons = {
    draft: '📝',
    active: '🔬',
    completed: '✅',
    archived: '📦'
  };
  
  return icons[status] || icons.draft;
};

// Local storage utilities
export const saveToLocalStorage = (key: string, data: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

export const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return defaultValue;
  }
};

export const removeFromLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
  }
};

// Type guards
export const isValidPlateType = (value: any): value is number => {
  return typeof value === 'number' && [6, 12, 24, 48, 96, 384].includes(value);
};

export const isValidStatus = (value: any): value is AssayPlate['status'] => {
  return typeof value === 'string' && ['draft', 'active', 'completed', 'archived'].includes(value);
};

// Array utilities
export const groupBy = <T, K extends keyof any>(
  array: T[],
  key: (item: T) => K
): Record<K, T[]> => {
  return array.reduce((result, item) => {
    const group = key(item);
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {} as Record<K, T[]>);
};

export const sortBy = <T>(
  array: T[],
  key: keyof T,
  direction: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aValue = a[key];
    const bValue = b[key];
    
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

// Debounce utility for search
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
