"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Save, FileDown, Upload, Trash, Calculator, Shuffle, FileUp, Share2, Copy, Check, X } from 'lucide-react';
import { TitrationCalculator } from '../lib/titration_calculation';
import { createShareUrl, parseShareUrl, getNotationStats } from '../lib/plate-notation';
import { PLATE_CONFIGURATIONS, type Well, type SavedPlate, type SelectionState } from '../lib/types';

// Add this function near the top of your component to determine well size based on plate type
const getWellSize = (plateType: keyof typeof PLATE_CONFIGURATIONS): { width: string, height: string } => {
  // Smaller sizes for larger plate formats and mobile
  switch (plateType) {
    case 384:
      return { width: 'w-8 md:w-14', height: 'h-8 md:h-14' };
    case 96:
      return { width: 'w-12 md:w-20', height: 'h-12 md:h-20' };
    default:
      return { width: 'w-16 md:w-24', height: 'h-16 md:h-24' };
  }
};

const getCompoundColor = (compound: string, concentration?: string, allWells?: { [key: string]: Well }): string => {
  if (!compound) return 'transparent';
  
  // Base palette - storing hue and saturation only
  const colorPalette = [
    { h: 0, s: 85 },      // Red
    { h: 210, s: 85 },    // Blue
    { h: 120, s: 70 },    // Green
    { h: 45, s: 90 },     // Yellow
    { h: 280, s: 75 },    // Purple
    { h: 30, s: 85 },     // Orange
    { h: 340, s: 80 },    // Pink
    { h: 180, s: 70 },    // Cyan
    { h: 160, s: 65 },    // Teal
    { h: 270, s: 60 },    // Violet
    { h: 15, s: 80 },     // Coral
    { h: 200, s: 75 },    // Sky Blue
    { h: 80, s: 65 },     // Lime
    { h: 320, s: 70 },    // Magenta
    { h: 190, s: 80 },    // Turquoise
    { h: 50, s: 85 },     // Bright Yellow
    { h: 140, s: 70 },    // Emerald
    { h: 240, s: 70 },    // Indigo
    { h: 20, s: 75 },     // Salmon
    { h: 300, s: 65 },    // Orchid
  ];
  
  // Improved hash function for better distribution
  let hash = 0;
  for (let i = 0; i < compound.length; i++) {
    const char = compound.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use hash to select a color from the palette
  const colorIndex = Math.abs(hash) % colorPalette.length;
  const baseColor = colorPalette[colorIndex];
  
  // Default lightness
  let lightness = 60;
  
  // If concentration and allWells are provided, adjust lightness based on concentration
  if (concentration && allWells) {
    const concValue = parseFloat(concentration);
    if (!isNaN(concValue)) {
      // Find all wells with the same compound
      const sameCompoundConcentrations = Object.values(allWells)
        .filter(w => w.compound === compound && w.concentration)
        .map(w => parseFloat(w.concentration || '0'))
        .filter(c => !isNaN(c));
      
      if (sameCompoundConcentrations.length > 0) {
        const minConc = Math.min(...sameCompoundConcentrations);
        const maxConc = Math.max(...sameCompoundConcentrations);
        
        // If there's a range, scale lightness from 75% (lighter, low dose) to 25% (dark, high dose)
        if (maxConc > minConc) {
          const normalized = (concValue - minConc) / (maxConc - minConc);
          lightness = 85 - (normalized * 50); // Maps 0->75%, 1->25%
        }
      }
    }
  }
  
  return `hsla(${baseColor.h}, ${baseColor.s}%, ${lightness}%, 0.85)`;
};

const AssayPlateDesigner = () => {
  const [plateType, setPlateType] = useState<keyof typeof PLATE_CONFIGURATIONS>(96);
  const [wells, setWells] = useState<{ [key: string]: Well }>({});
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [editData, setEditData] = useState({
    cellType: '',
    compound: '',
    concentration: '',
    concentrationUnits: ''
  });
  const [uniqueCompounds, setUniqueCompounds] = useState<Set<string>>(new Set());

  const [edgeEffectEnabled, setEdgeEffectEnabled] = useState(false);
  const [unusableWells, setUnusableWells] = useState<Set<string>>(new Set());

  // Legend dragging state
  const [legendPosition, setLegendPosition] = useState({ x: 8, y: 100 });
  const [isDraggingLegend, setIsDraggingLegend] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isLegendVisible, setIsLegendVisible] = useState(true);

  const getSelectedWells = useCallback(() => {
    if (!selection) return [];
    
    const startRow = Math.min(selection.fixed.row, selection.moving.row);
    const endRow = Math.max(selection.fixed.row, selection.moving.row);
    const startCol = Math.min(selection.fixed.col, selection.moving.col);
    const endCol = Math.max(selection.fixed.col, selection.moving.col);
    
    const selectedWells = [];
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const wellId = `${getRowLabel(row)}${col + 1}`;
        if (!unusableWells.has(wellId)) {
          selectedWells.push(wellId);
        }
      }
    }
    return selectedWells;
  }, [selection, unusableWells]);
  
  const plateRef = useRef(null);

  const [savedPlates, setSavedPlates] = useState<{ [key: string]: SavedPlate }>({});
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPlateName, setNewPlateName] = useState('');

  const [, setActiveEdge] = useState<'horizontal' | 'vertical' | null>(null);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showTitrationModal, setShowTitrationModal] = useState(false);

  // Quick Share state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareStats, setShareStats] = useState<{ charCount: number; wellCount: number; estimatedQrVersion: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const [wellsHistory, setWellsHistory] = useState<Array<{ [key: string]: Well }>>([{}]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const isUndoingRef = useRef(false);

  const saveToHistory = useCallback((newWells: { [key: string]: Well }) => {
    if (isUndoingRef.current) return;
    
    const newHistory = wellsHistory.slice(0, historyIndex + 1);
    newHistory.push({ ...newWells });
    setWellsHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [wellsHistory, historyIndex]);

  // Add this ref at the top of your component to track the previous edge effect state
  const prevEdgeEffectStateRef = useRef<boolean | undefined>(undefined);
  const prevPlateTypeRef = useRef<keyof typeof PLATE_CONFIGURATIONS | undefined>(undefined);

  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for the hidden file input

  // Function to trigger the hidden file input
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Function to parse CSV row, handling quotes
  const parseCsvRow = (row: string): string[] => {
    const result: string[] = [];
    let currentField = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"' && (i === 0 || row[i - 1] !== '\\')) { // Handle escaped quotes later if needed
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    result.push(currentField.trim()); // Add the last field
    return result.map(field => field.startsWith('"') && field.endsWith('"') ? field.slice(1, -1) : field);
  };

  // Updated file upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        alert('Error reading file content.');
        return;
      }

      try {
        const lines = text.trim().split(/\r?\n/); // Split lines, handle Windows/Unix endings
        if (lines.length < 2) {
          alert('CSV file must contain at least a header and one data row.');
          return;
        }

        const header = parseCsvRow(lines[0]);
        
        // Find indices of required and optional columns
        const wellIndex = header.findIndex(h => h.toLowerCase() === 'well');
        const cellTypeIndex = header.findIndex(h => h.toLowerCase() === 'cell type');
        const compoundIndex = header.findIndex(h => h.toLowerCase() === 'compound');
        const concentrationIndex = header.findIndex(h => h.toLowerCase() === 'concentration');
        const unitsIndex = header.findIndex(h => h.toLowerCase() === 'concentration units');
        const titrationIdIndex = header.findIndex(h => h.toLowerCase() === 'titration id');
        const dilutionStepIndex = header.findIndex(h => h.toLowerCase() === 'dilution step');
        const replicateIndex = header.findIndex(h => h.toLowerCase() === 'replicate');

        // Validate required columns
        if (wellIndex === -1 || cellTypeIndex === -1 || compoundIndex === -1) {
          alert('CSV file is missing required columns: "Well", "Cell Type", or "Compound".');
          return;
        }

        const newWells: { [key: string]: Well } = {};
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue; // Skip empty lines
          const rowData = parseCsvRow(lines[i]);
          const wellId = rowData[wellIndex]; 

          if (!wellId) continue; // Skip rows without a Well ID

          // Basic validation for wellId format (e.g., A1, B12)
          if (!/^[A-Z]+\d+$/.test(wellId)) {
             console.warn(`Skipping row ${i + 1}: Invalid Well ID format "${wellId}"`);
             continue;
          }

          newWells[wellId] = {
            cellType: rowData[cellTypeIndex] ?? '',
            compound: rowData[compoundIndex] ?? '',
            concentration: concentrationIndex !== -1 ? rowData[concentrationIndex] ?? '' : '',
            concentrationUnits: unitsIndex !== -1 ? rowData[unitsIndex] ?? '' : '',
            titrationId: titrationIdIndex !== -1 ? rowData[titrationIdIndex] ?? '' : '',
            // Handle potential numeric conversion for dilutionStep and replicate
            dilutionStep: dilutionStepIndex !== -1 && rowData[dilutionStepIndex] ? Number(rowData[dilutionStepIndex]) : undefined,
            replicate: replicateIndex !== -1 && rowData[replicateIndex] ? Number(rowData[replicateIndex]) : undefined,
          };
        }

        saveToHistory(wells); // Save current state before overwriting
        setWells(newWells);
        saveToHistory(newWells); // Save new state
        setSelection(null); // Clear selection after import
        alert('Plate data imported successfully!');

      } catch (error) {
        console.error("Error parsing CSV:", error);
        alert('Failed to parse CSV file. Please ensure it is correctly formatted.');
      }

      // Reset file input value to allow uploading the same file again
      if (event.target) {
        event.target.value = '';
      }
    };

    reader.onerror = () => {
      alert('Error reading file.');
      // Reset file input value
      if (event.target) {
        event.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  // Check for shared plate in URL hash on initial load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sharedPlate = parseShareUrl();
      if (sharedPlate) {
        setPlateType(sharedPlate.plateType);
        setWells(sharedPlate.wells);
        // Clear the hash after loading
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  // Handle Quick Share
  const handleQuickShare = useCallback(() => {
    const url = createShareUrl(plateType, wells);
    setShareUrl(url);
    
    // Get the notation part for stats
    const notation = url.split('#pn=')[1];
    if (notation) {
      const decoded = decodeURIComponent(notation);
      setShareStats(getNotationStats(decoded));
    }
    
    setShowShareModal(true);
    setCopied(false);
  }, [plateType, wells]);

  // Copy share URL to clipboard
  const copyShareUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [shareUrl]);

  useEffect(() => {
    // Only run this effect if edgeEffectEnabled or plateType has changed
    // This prevents the infinite loop
    if (prevEdgeEffectStateRef.current === edgeEffectEnabled && 
        prevPlateTypeRef.current === plateType) {
      return;
    }
    
    // Update our refs with current values
    prevEdgeEffectStateRef.current = edgeEffectEnabled;
    prevPlateTypeRef.current = plateType;
    
    const { rows, cols } = PLATE_CONFIGURATIONS[plateType];
    const newUnusableWells = new Set<string>();
    const wellsToUpdate = { ...wells };
    let changed = false;

    if (edgeEffectEnabled) {
      for (let r = 0; r < rows; r++) {
        newUnusableWells.add(`${getRowLabel(r)}${1}`);
        newUnusableWells.add(`${getRowLabel(r)}${cols}`);
      }
      for (let c = 0; c < cols; c++) {
        newUnusableWells.add(`${getRowLabel(0)}${c + 1}`);
        newUnusableWells.add(`${getRowLabel(rows - 1)}${c + 1}`);
      }

      newUnusableWells.forEach(wellId => {
        if (wellsToUpdate[wellId] && Object.values(wellsToUpdate[wellId]).some(val => val)) {
          wellsToUpdate[wellId] = {};
          changed = true;
        }
      });
      
      setUnusableWells(newUnusableWells);
      if (changed) {
        saveToHistory(wells);
        setWells(wellsToUpdate);
        saveToHistory(wellsToUpdate);
      }
      
      if (selection) {
        const currentSelectionIncludesUnusable = getSelectedWells().some(id => newUnusableWells.has(id));
        if (currentSelectionIncludesUnusable) {
          setSelection(null);
        }
      }

    } else {
      setUnusableWells(new Set());
    }
  // Remove wells from dependency array to prevent the infinite loop
  // Keep only edgeEffectEnabled and plateType as dependencies
  }, [edgeEffectEnabled, plateType, getSelectedWells, saveToHistory]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleKeyDown = (e: KeyboardEvent) => {   
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
          e.preventDefault();
          
          if (historyIndex > 0) {
            isUndoingRef.current = true;
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            
            setWells({ ...wellsHistory[newIndex] });
            
            setTimeout(() => {
              isUndoingRef.current = false;
            }, 0);
          }
          return;
        }

        if (!selection) return;

        if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
          return;
        }

        if ((e.metaKey || e.ctrlKey)) {
          if (e.key === 'c') {
            e.preventDefault();
            const selectedWellIds = getSelectedWells();
            const wellData = selectedWellIds.map(wellId => {
              const well = wells[wellId] || {};
              return {
                cellType: well.cellType || '',
                compound: well.compound || '',
                concentration: well.concentration || '',
                concentrationUnits: well.concentrationUnits || '',
                dilutionStep: well.dilutionStep,
                replicate: well.replicate,
                titrationId: well.titrationId
              };
            });
            navigator.clipboard.writeText(JSON.stringify(wellData));
            return;
          }

          if (e.key === 'x') {
            e.preventDefault();
            const selectedWellIds = getSelectedWells();
            const wellData = selectedWellIds.map(wellId => {
              const well = wells[wellId] || {};
              return {
                cellType: well.cellType || '',
                compound: well.compound || '',
                concentration: well.concentration || '',
                concentrationUnits: well.concentrationUnits || '',
                dilutionStep: well.dilutionStep,
                replicate: well.replicate,
                titrationId: well.titrationId
              };
            });
            navigator.clipboard.writeText(JSON.stringify(wellData));
            
            saveToHistory(wells);

            const newWells = { ...wells };
            selectedWellIds.forEach(wellId => {
              newWells[wellId] = {
                cellType: '',
                compound: '',
                concentration: '',
                concentrationUnits: '',
                dilutionStep: undefined,
                replicate: undefined,
                titrationId: undefined
              };
            });
            saveToHistory(newWells);
            setWells(newWells);
            return;
          }

          if (e.key === 'v') {
            navigator.clipboard.readText()
              .then(text => {
                try {
                  const pastedData = JSON.parse(text);
                  if (!Array.isArray(pastedData)) return;
                  
                  const selectedWellIds = getSelectedWells();
                  const newWells = { ...wells };
                  
                  selectedWellIds.forEach((wellId, index) => {
                    if (index < pastedData.length) {
                      newWells[wellId] = {
                        ...wells[wellId],
                        ...pastedData[index]
                      };
                    }
                  });
                  
                  saveToHistory(wells);
                  setWells(newWells);
                } catch (err) {
                  console.error('Failed to paste well data:', err);
                }
              });
            return;
          }
        }
        
        if (document.activeElement?.tagName === 'INPUT') return;
    
        const { rows, cols } = PLATE_CONFIGURATIONS[plateType];

        if (e.key === 'Delete'|| e.key === 'Backspace') {
          e.preventDefault();
          const selectedWellIds = getSelectedWells();
          const newWells = { ...wells };
          
          saveToHistory(wells);

          selectedWellIds.forEach(wellId => {
            newWells[wellId] = {
              cellType: '',
              compound: '',
              concentration: '',
              concentrationUnits: '',
              dilutionStep: undefined,
              replicate: undefined,
              titrationId: undefined
            };
          });
          
          saveToHistory(newWells);
          setWells(newWells);
        }
    
        if (e.shiftKey) {
          e.preventDefault();
          const newSelection = { ...selection };
          
          newSelection.lastMoving = { ...newSelection.moving };
          
          switch (e.key) {
            case 'ArrowLeft':
              if (newSelection.moving.col > 0) {
                if (newSelection.lastMoving && newSelection.lastMoving.col > newSelection.moving.col) {
                  newSelection.moving.col = Math.max(0, newSelection.moving.col - 1);
                } else {
                  newSelection.moving.col = Math.max(0, newSelection.moving.col - 1);
                }
                setActiveEdge('horizontal');
              }
              break;
              
            case 'ArrowRight':
              if (newSelection.moving.col < cols - 1) {
                if (newSelection.lastMoving && newSelection.lastMoving.col < newSelection.moving.col) {
                  newSelection.moving.col = Math.min(cols - 1, newSelection.moving.col + 1);
                } else {
                  newSelection.moving.col = Math.min(cols - 1, newSelection.moving.col + 1);
                }
                setActiveEdge('horizontal');
              }
              break;
              
            case 'ArrowUp':
              if (newSelection.moving.row > 0) {
                if (newSelection.lastMoving && newSelection.lastMoving.row > newSelection.moving.row) {
                  newSelection.moving.row = Math.max(0, newSelection.moving.row - 1);
                } else {
                  newSelection.moving.row = Math.max(0, newSelection.moving.row - 1);
                }
                setActiveEdge('vertical');
              }
              break;
              
            case 'ArrowDown':
              if (newSelection.moving.row < rows - 1) {
                if (newSelection.lastMoving && newSelection.lastMoving.row < newSelection.moving.row) {
                  newSelection.moving.row = Math.min(rows - 1, newSelection.moving.row + 1);
                } else {
                  newSelection.moving.row = Math.min(rows - 1, newSelection.moving.row + 1);
                }
                setActiveEdge('vertical');
              }
              break;
          }
          
          setSelection(newSelection);
        }
        else {
          e.preventDefault();
          const newSelection = { ...selection };
          
          switch (e.key) {
            case 'ArrowLeft':
              if (selection.fixed.col > 0 && selection.moving.col > 0) {
                newSelection.fixed.col--;
                newSelection.moving.col--;
              }
              break;
              
            case 'ArrowRight':
              if (selection.fixed.col < cols - 1 && selection.moving.col < cols - 1) {
                newSelection.fixed.col++;
                newSelection.moving.col++;
              }
              break;
              
            case 'ArrowUp':
              if (selection.fixed.row > 0 && selection.moving.row > 0) {
                newSelection.fixed.row--;
                newSelection.moving.row--;
              }
              break;
              
            case 'ArrowDown':
              if (selection.fixed.row < rows - 1 && selection.moving.row < rows - 1) {
                newSelection.fixed.row++;
                newSelection.moving.row++;
              }
              break;
          }
          
          setSelection(newSelection);
        }
        
      };
  
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selection, plateType, wells, wellsHistory, historyIndex, getSelectedWells, saveToHistory]);

  useEffect(() => {    
    const compounds = new Set<string>();
    Object.values(wells).forEach(well => {
      const typedWell = well as Well;
      if (typedWell.compound) {
        if (typedWell.compound) {
          compounds.add(typedWell.compound);
        }
      }
    });
    setUniqueCompounds(compounds);
  }, [wells]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('savedPlates');
      if (saved) {
        setSavedPlates(JSON.parse(saved));
      }
    }
  }, []);

  useEffect(() => {
    if (selection) {
      const selectedWellIds = getSelectedWells();
      if (selectedWellIds.length > 0) {
        const firstWell = wells[selectedWellIds[0]] || {
          cellType: '',
          compound: '',
          concentration: '',
          concentrationUnits: ''
        };
          
          setEditData({
            cellType: firstWell.cellType || '',
            compound: firstWell.compound || '',
            concentration: firstWell.concentration || '',
            concentrationUnits: firstWell.concentrationUnits || ''
          });
        }
    } else {
      setEditData({
        cellType: '',
        compound: '',
        concentration: '',
        concentrationUnits: ''
      });
    }
  }, [selection, wells, getSelectedWells]);

  const getRowLabel = (index: number): string => {
    return String.fromCharCode(65 + index);
  };

  const handleMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    const wellId = `${getRowLabel(row)}${col + 1}`;
    
    if (unusableWells.has(wellId)) return;

    if (getSelectedWells().includes(wellId)) {
      setSelection(null); 
      return;
    }
    
    setIsSelecting(true);
    if (e.shiftKey && selection) {
      const fixedWellId = `${getRowLabel(selection.fixed.row)}${selection.fixed.col + 1}`;
      if (unusableWells.has(fixedWellId)) return; 

      setSelection({
        ...selection,
        moving: { row, col },
        lastMoving: selection.moving
      });
    } else {
      setSelection({
        fixed: { row, col },
        moving: { row, col }
      });
    }
  };

  const handleMouseMove = (row: number, col: number) => {
    if (isSelecting && selection) {
       const movingWellId = `${getRowLabel(row)}${col + 1}`;
       if (unusableWells.has(movingWellId)) return;

      setSelection(prev => ({
        ...prev!,
        moving: { row, col }
      }));
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  const handleWellUpdate = () => {
    const selectedWells = getSelectedWells();
    if (selectedWells.length === 0) return;

    const newWells = { ...wells };
    
    selectedWells.forEach(wellId => {
      if (!unusableWells.has(wellId)) { 
        const existingWell = wells[wellId] || {};
        newWells[wellId] = {
          ...existingWell,
          // Only update fields that have values in editData (trim to check for empty strings)
          ...(editData.cellType.trim() && { cellType: editData.cellType }),
          ...(editData.compound.trim() && { compound: editData.compound }),
          ...(editData.concentration.trim() && { concentration: editData.concentration }),
          ...(editData.concentrationUnits.trim() && { concentrationUnits: editData.concentrationUnits })
        };
      }
    });
    
    saveToHistory(wells);
    setWells(newWells);
    saveToHistory(newWells);
    setSelection(null);
    // Clear the form after applying
    setEditData({
      cellType: '',
      compound: '',
      concentration: '',
      concentrationUnits: ''
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selection && getSelectedWells().length > 0) {
      e.preventDefault();
      handleWellUpdate();
    } else if (e.key === 'Escape') {
      setEditData({
        cellType: '',
        compound: '',
        concentration: '',
        concentrationUnits: ''
      });
    }
  };

  const handleLegendMouseDown = (e: React.MouseEvent) => {
    setIsDraggingLegend(true);
    setDragOffset({
      x: e.clientX - legendPosition.x,
      y: e.clientY - legendPosition.y
    });
  };

  const handleLegendMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingLegend) {
      setLegendPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  }, [isDraggingLegend, dragOffset]);

  const handleLegendMouseUp = useCallback(() => {
    setIsDraggingLegend(false);
  }, []);

  useEffect(() => {
    if (isDraggingLegend) {
      window.addEventListener('mousemove', handleLegendMouseMove);
      window.addEventListener('mouseup', handleLegendMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleLegendMouseMove);
        window.removeEventListener('mouseup', handleLegendMouseUp);
      };
    }
  }, [isDraggingLegend, handleLegendMouseMove, handleLegendMouseUp]);

  const handleRowSelect = (rowIndex: number) => {
    const { rows, cols } = PLATE_CONFIGURATIONS[plateType];
    if (edgeEffectEnabled && (rowIndex === 0 || rowIndex === rows - 1)) return;

    let startCol = 0;
    let endCol = cols - 1;
    if (edgeEffectEnabled) {
      startCol = 1;
      endCol = cols - 2;
    }
    if (startCol > endCol) return;

    setSelection({
      fixed: { row: rowIndex, col: startCol },
      moving: { row: rowIndex, col: endCol }
    });
  };

  const handleColumnSelect = (colIndex: number) => {
    const { rows, cols } = PLATE_CONFIGURATIONS[plateType];
    if (edgeEffectEnabled && (colIndex === 0 || colIndex === cols - 1)) return;

    let startRow = 0;
    let endRow = rows - 1;
     if (edgeEffectEnabled) {
      startRow = 1;
      endRow = rows - 2;
    }
    if (startRow > endRow) return;

    setSelection({
      fixed: { row: startRow, col: colIndex },
      moving: { row: endRow, col: colIndex }
    });
  };

  const handleRandomize = () => {
    const selectedWellIds = getSelectedWells();
    if (selectedWellIds.length <= 1) return;

    const selectedWellData = selectedWellIds.map(id => wells[id] || {});

    for (let i = selectedWellData.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selectedWellData[i], selectedWellData[j]] = [selectedWellData[j], selectedWellData[i]];
    }

    const newWells = { ...wells };
    selectedWellIds.forEach((wellId, index) => {
      newWells[wellId] = selectedWellData[index];
    });

    saveToHistory(wells);
    setWells(newWells);
    saveToHistory(newWells);
    setSelection(null);
  };

  const exportToCSV = () => {
    const { rows, cols } = PLATE_CONFIGURATIONS[plateType];
    // Add headers with potential titration/replicate info
    let csv = 'Well,Cell Type,Compound,Concentration,Concentration Units,Titration ID,Dilution Step,Replicate\n';
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const wellId = `${getRowLabel(row)}${col + 1}`;
        const well = wells[wellId] || {}; // Get well data or empty object
        
        // Ensure undefined values become empty strings for CSV
        const cellType = well.cellType ?? '';
        const compound = well.compound ?? '';
        const concentration = well.concentration ?? '';
        const concentrationUnits = well.concentrationUnits ?? '';
        const titrationId = well.titrationId ?? '';
        const dilutionStep = well.dilutionStep ?? '';
        const replicate = well.replicate ?? '';

        // Append row data, escaping commas within fields if necessary (basic example)
        csv += `${wellId},"${cellType}","${compound}","${concentration}","${concentrationUnits}","${titrationId}","${dilutionStep}","${replicate}"\n`;
      }
    }
    
    if (typeof window !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plate_config.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const saveConfiguration = () => {
    if (!newPlateName) {
      setShowSaveModal(true);
    } else {
      const updatedSavedPlates = {
        ...savedPlates,
        [newPlateName]: { plateType, wells },
      };
      setSavedPlates(updatedSavedPlates);
      if (typeof window !== 'undefined') {
        localStorage.setItem('savedPlates', JSON.stringify(updatedSavedPlates));
      }
      setShowSaveModal(false);
      setNewPlateName('');
    }
  };

  const loadConfiguration = (plateName: string) => {
    const config = savedPlates[plateName];
    if (config) {
      setPlateType(config.plateType);
      setWells(config.wells);
      setShowLoadModal(false);
    }
  };

  return (
    <div className="p-2 md:p-6 max-w-full md:max-w-6xl mx-auto select-none overflow-x-auto">
      {uniqueCompounds.size > 0 && (
        <>
          {/* Toggle button for mobile */}
          <button
            onClick={() => setIsLegendVisible(!isLegendVisible)}
            className="fixed top-2 right-2 md:hidden z-30 bg-blue-500 text-white p-2 rounded-full shadow-lg"
            aria-label="Toggle legend"
          >
            {isLegendVisible ? '✕' : '☰'}
          </button>
          
          {isLegendVisible && (
            <div 
              className="fixed w-32 md:w-40 p-2 md:p-3 border rounded bg-white shadow-md z-20 max-h-64 md:max-h-96 overflow-y-auto cursor-move text-xs md:text-sm"
              style={{ 
                left: `${legendPosition.x}px`, 
                top: `${legendPosition.y}px` 
              }}
              onMouseDown={handleLegendMouseDown}
            >
              <div className="flex justify-between items-center mb-1 md:mb-2">
                <h3 className="font-bold text-xs md:text-sm">Compound Legend</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLegendVisible(false);
                  }}
                  className="md:hidden text-gray-500 hover:text-gray-700 text-lg leading-none"
                  aria-label="Close legend"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-col space-y-1 md:space-y-2">
                {[...uniqueCompounds].map((compound: string) => (
                  <div
                    key={compound}
                    className="flex items-center p-0.5 md:p-1 rounded text-xs"
                    style={{ backgroundColor: getCompoundColor(compound) }}
                  >
                    <span className="truncate text-xs">{compound}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="mb-4 md:mb-6 space-y-2 md:space-y-4">
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <select
            value={plateType.toString()}
            onChange={(e) => {
              setPlateType(Number(e.target.value) as keyof typeof PLATE_CONFIGURATIONS);
              setSelection(null);
            }}
            className="p-2 border rounded"
          >
            {Object.entries(PLATE_CONFIGURATIONS).map(([type]) => (
              <option key={type} value={type}>
                {type}-well plate
              </option>
            ))}
          </select>
          
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <Save className="w-4 h-4 mr-2" /> Save
          </button>

          <button
            onClick={() => setShowLoadModal(true)}
            className="flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            <Upload className="w-4 h-4 mr-2" /> Load
          </button>

          <button
          onClick={() => setShowClearConfirm(true)}
          className="flex items-center px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
          <Trash className="w-4 h-4 mr-2" /> Clear Saved
          </button>
          
          {/* Add Import CSV Button */}
          <button
            onClick={triggerFileInput} // Correct: triggers the hidden input
            className="flex items-center px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600"
          >
            <FileUp className="w-4 h-4 mr-2" /> Import CSV
          </button>
          
          <button
            onClick={exportToCSV} // Ensure this is exportToCSV, not handleFileUpload
            className="flex items-center px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            <FileDown className="w-4 h-4 mr-2" /> Export CSV
          </button>

          <button
            onClick={handleQuickShare}
            disabled={Object.keys(wells).length === 0}
            className={`flex items-center px-4 py-2 text-white rounded ${
              Object.keys(wells).length > 0
                ? 'bg-orange-500 hover:bg-orange-600'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
            title="Create a shareable URL for this plate"
          >
            <Share2 className="w-4 h-4 mr-2" /> Quick Share
          </button>

          <button
            onClick={() => setShowTitrationModal(true)}
            className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            <Calculator className="w-4 h-4 mr-2" /> Setup Titration
          </button>

          <label className="flex items-center space-x-1 md:space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={edgeEffectEnabled}
              onChange={(e) => setEdgeEffectEnabled(e.target.checked)}
              className="form-checkbox h-4 w-4 md:h-5 md:w-5 text-blue-600"
            />
            <span className="text-xs md:text-sm">Edge Effect Exclusion</span>
          </label>
        </div>

        {/* Hidden File Input */}
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload} // Attach the handler
          accept=".csv" // Accept only CSV files
          style={{ display: 'none' }} // Hide the input element
        />

        <div className="space-y-1.5 md:space-y-2">
          <input
            type="text"
            placeholder="Cell Type"
            value={editData.cellType}
            onChange={(e) => setEditData(prev => ({ ...prev, cellType: e.target.value }))}
            onKeyDown={handleKeyDown}
            className={`p-1.5 md:p-2 border rounded w-full text-sm md:text-base ${!selection || getSelectedWells().length === 0 ? 'opacity-50' : ''}`}
            disabled={!selection || getSelectedWells().length === 0}
          />
          <input
            type="text"
            placeholder="Compound"
            value={editData.compound}
            onChange={(e) => setEditData(prev => ({ ...prev, compound: e.target.value }))}
            onKeyDown={handleKeyDown}
            className={`p-1.5 md:p-2 border rounded w-full text-sm md:text-base ${!selection || getSelectedWells().length === 0 ? 'opacity-50' : ''}`}
            disabled={!selection || getSelectedWells().length === 0}
          />
          <div className="flex space-x-1.5 md:space-x-2">
            <input
              type="text"
              placeholder="Concentration"
              value={editData.concentration}
              onChange={(e) => setEditData(prev => ({ ...prev, concentration: e.target.value }))}
              onKeyDown={handleKeyDown}
              className={`p-1.5 md:p-2 border rounded w-full text-sm md:text-base ${!selection || getSelectedWells().length === 0 ? 'opacity-50' : ''}`}
              disabled={!selection || getSelectedWells().length === 0}
            />
            <input
              type="text"
              placeholder="Units"
              value={editData.concentrationUnits}
              onChange={(e) => setEditData(prev => ({ ...prev, concentrationUnits: e.target.value }))}
              onKeyDown={handleKeyDown}
              className={`p-1.5 md:p-2 border rounded w-full text-sm md:text-base ${!selection || getSelectedWells().length === 0 ? 'opacity-50' : ''}`}
              disabled={!selection || getSelectedWells().length === 0}
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleWellUpdate}
              disabled={!selection || getSelectedWells().length === 0}
              className={`flex-1 px-4 py-2 text-white rounded ${
                selection && getSelectedWells().length > 0
                ? 'bg-blue-500 hover:bg-blue-600' 
                : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {selection && getSelectedWells().length > 0 ? 'Update Selected Wells' : 'Select Wells to Update'}
            </button>
            <button
              onClick={handleRandomize}
              disabled={!selection || getSelectedWells().length <= 1}
              className={`flex items-center justify-center px-4 py-2 text-white rounded ${
                selection && getSelectedWells().length > 1
                ? 'bg-indigo-500 hover:bg-indigo-600'
                : 'bg-gray-400 cursor-not-allowed'
              }`}
              title="Randomize data within selected wells"
            >
              <Shuffle className="w-4 h-4 mr-2" /> Randomize
            </button>
          </div>
        </div>
      </div>

      <div className="relative overflow-auto">
        <div 
          ref={plateRef}
          className="inline-block"
          onMouseLeave={handleMouseUp}
        >
         <div 
          className="absolute top-0 left-0 w-8 h-8 bg-gray-200 hover:bg-gray-300 flex items-center justify-center cursor-pointer z-10"
          onClick={() => {
            const { rows, cols } = PLATE_CONFIGURATIONS[plateType];
            if (selection && getSelectedWells().length > 0) {
              setSelection(null);
            } else {
              let startRow = 0, endRow = rows - 1, startCol = 0, endCol = cols - 1;
              if (edgeEffectEnabled) {
                startRow = 1; endRow = rows - 2;
                startCol = 1; endCol = cols - 2;
              }
              if (startRow <= endRow && startCol <= endCol) {
                setSelection({
                  fixed: { row: startRow, col: startCol },
                  moving: { row: endRow, col: endCol }
                });
              } else {
                 setSelection(null);
              }
            }
          }}
        >
          ☐
        </div> 
          <div className="flex">
            <div className="w-8" />
            {Array.from({length: PLATE_CONFIGURATIONS[plateType].cols}).map((_, colIndex) => (
              <div
                key={colIndex}
                className={`${getWellSize(plateType).width} h-8 md:h-10 flex items-center justify-center text-sm md:text-base font-semibold ${
                  edgeEffectEnabled && (colIndex === 0 || colIndex === PLATE_CONFIGURATIONS[plateType].cols - 1)
                  ? 'bg-gray-200 cursor-not-allowed'
                  : 'cursor-pointer hover:bg-gray-100'
                }`}
                onClick={() => handleColumnSelect(colIndex)}
              >
                {colIndex + 1}
              </div>
            ))}
          </div>

          {Array.from({length: PLATE_CONFIGURATIONS[plateType].rows}).map((_, rowIndex) => (
            <div key={rowIndex} className="flex">
              <div
                className={`w-8 md:w-10 ${getWellSize(plateType).height} flex items-center justify-center text-sm md:text-base font-semibold ${
                  edgeEffectEnabled && (rowIndex === 0 || rowIndex === PLATE_CONFIGURATIONS[plateType].rows - 1)
                  ? 'bg-gray-200 cursor-not-allowed'
                  : 'cursor-pointer hover:bg-gray-100'
                }`}
                onClick={() => handleRowSelect(rowIndex)}
              >
                {String.fromCharCode(65 + rowIndex)}
              </div>
              {Array.from({length: PLATE_CONFIGURATIONS[plateType].cols}).map((_, colIndex) => {
                const wellId = `${String.fromCharCode(65 + rowIndex)}${colIndex + 1}`;
                const well: Well = wells[wellId] || {};
                const isUnusable = unusableWells.has(wellId);
                const isSelected = !isUnusable && getSelectedWells().includes(wellId);
                const baseBgColor = well.compound ? getCompoundColor(well.compound, well.concentration, wells) : 'white';
                const finalBgColor = isUnusable ? 'rgb(229 231 235)' : baseBgColor;

                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`${getWellSize(plateType).width} ${getWellSize(plateType).height} border border-gray-300 relative overflow-hidden ${
                      isUnusable ? 'cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    style={{ backgroundColor: finalBgColor }}
                    onMouseDown={(e) => handleMouseDown(rowIndex, colIndex, e)}
                    onMouseMove={() => handleMouseMove(rowIndex, colIndex)}
                    onMouseUp={handleMouseUp}
                  >
                    {isSelected && (
                      <div className="absolute inset-0 bg-blue-500 opacity-30 pointer-events-none" />
                    )}
                    {isUnusable && (
                       <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xl pointer-events-none">
                         X
                       </div>
                    )}
                    {!isUnusable && (
                      <div className="absolute inset-0 p-0.5 md:p-1 text-xs md:text-sm overflow-hidden pointer-events-none">
                        {plateType < 384 && well.cellType && <span className="block truncate font-medium">{well.cellType}</span>}
                        {well.compound && <span className="block truncate font-semibold">{well.compound}</span>}
                        {plateType < 384 && well.concentration && (
                          <span className="block truncate">
                            {well.concentration} {well.concentrationUnits}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Save Plate Configuration</h2>
            <input
              type="text"
              placeholder="Plate Name"
              value={newPlateName}
              onChange={(e) => setNewPlateName(e.target.value)}
              className="p-2 border rounded w-full"
            />
            <button
              onClick={saveConfiguration}
              className="mt-4 w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save
            </button>
            <button
              onClick={() => setShowSaveModal(false)}
              className="mt-2 w-full p-2 bg-gray-200 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showLoadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Load Plate Configuration</h2>
            {Object.keys(savedPlates).length > 0 ? (
              <ul className="max-h-60 overflow-y-auto mb-4 border rounded">
                {Object.keys(savedPlates).map((plateName) => (
                  <li
                    key={plateName}
                    onClick={() => loadConfiguration(plateName)}
                    className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                  >
                    {plateName} ({savedPlates[plateName].plateType}-well)
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 mb-4">No saved plates found.</p>
            )}
            <button
              onClick={() => setShowLoadModal(false)}
              className="mt-2 w-full p-2 bg-gray-200 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Clear Saved Plates?</h2>
            <p className="mb-4">Are you sure you want to clear all saved plate configurations? This cannot be undone.</p>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  localStorage.removeItem('savedPlates');
                  setSavedPlates({});
                  setShowClearConfirm(false);
                }}
                className="flex-1 p-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Clear
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 p-2 bg-gray-200 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showTitrationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Setup Titration</h2>
            <TitrationCalculator 
              onCalculate={(results) => {
                const newWells = { ...wells };
                let updated = false;
                results.forEach(result => {
                  if (!unusableWells.has(result.wellId)) {
                    newWells[result.wellId] = {
                      ...wells[result.wellId],
                      compound: result.compound,
                      concentration: result.concentration.toString(),
                      concentrationUnits: result.units,
                      dilutionStep: result.dilutionStep,
                      replicate: result.replicate,
                      titrationId: result.titrationId
                    };
                    updated = true;
                  }
                });
                if (updated) {
                  saveToHistory(wells);
                  setWells(newWells);
                  saveToHistory(newWells);
                }
                setShowTitrationModal(false);
              }}
              onCancel={() => setShowTitrationModal(false)}
            />
          </div>
        </div>
      )}

      {/* Quick Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Quick Share</h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Share this link to let others view your plate configuration. 
              <span className="text-orange-600 font-medium"> Note: This link is not encrypted.</span>
            </p>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 p-2 border rounded bg-gray-50 text-sm font-mono truncate"
              />
              <button
                onClick={copyShareUrl}
                className={`flex items-center px-3 py-2 rounded transition-colors ${
                  copied 
                    ? 'bg-green-500 text-white' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {shareStats && (
              <div className="text-xs text-gray-500 mb-4 p-2 bg-gray-50 rounded">
                <p>📊 <strong>Stats:</strong> {shareStats.wellCount} wells, {shareStats.charCount} characters</p>
                <p>📱 <strong>QR Code:</strong> Would need version {shareStats.estimatedQrVersion} (
                  {shareStats.estimatedQrVersion <= 6 ? '✅ easy to scan' : 
                   shareStats.estimatedQrVersion <= 11 ? '⚠️ medium density' : '⚠️ high density'}
                )</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Open in new window to test
                  window.open(shareUrl, '_blank');
                }}
                className="flex-1 p-2 bg-gray-100 rounded hover:bg-gray-200"
              >
                Test Link
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssayPlateDesigner;