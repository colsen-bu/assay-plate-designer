"use client"

import React, { useState, useRef, useEffect } from 'react';
import {Save, FileDown, Upload, Trash, Calculator } from 'lucide-react';
import { TitrationCalculator } from '../lib/titration_calculation';

const PLATE_CONFIGURATIONS = {
  6: { rows: 2, cols: 3 },
  12: { rows: 3, cols: 4 },
  24: { rows: 4, cols: 6 },
  48: { rows: 6, cols: 8 },
  96: { rows: 8, cols: 12 },
  384: { rows: 16, cols: 24 }
};

// Function to generate a consistent color for a compound name
interface Well {
  cellType?: string;
  compound?: string;
  concentration?: string;
  concentrationUnits?: string;
  dilutionStep?: number;
  replicate?: number;
  titrationId?: string;
}

// 1. Add interface for saved plates
interface SavedPlate {
  plateType: keyof typeof PLATE_CONFIGURATIONS;
  wells: { [key: string]: Well };
}

// Add new interfaces
interface SelectionEdge {
  row: number;
  col: number;
}

interface SelectionState {
  fixed: SelectionEdge;
  moving: SelectionEdge;
  lastMoving?: SelectionEdge; // Track previous position
}


const getCompoundColor = (compound: string): string => {
  if (!compound) return 'transparent';
  
  // Basic hash function to generate a number from a string
  const hash = compound.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  // Generate HSL color with consistent saturation and lightness
  const hue = Math.abs(hash % 360);
  return `hsla(${hue}, 70%, 85%, 0.8)`;
};

const AssayPlateDesigner = () => {
  const [plateType, setPlateType] = useState<keyof typeof PLATE_CONFIGURATIONS>(96);
  const [wells, setWells] = useState<{ [key: string]: Well }>({});
  const [isSelecting, setIsSelecting] = useState(false);
  const [editData, setEditData] = useState({
    cellType: '',
    compound: '',
    concentration: '',
    concentrationUnits: ''
  });
  const [uniqueCompounds, setUniqueCompounds] = useState<Set<string>>(new Set());

  // Update getSelectedWells for new selection format
  const getSelectedWells = () => {
    if (!selection) return [];
    
    const startRow = Math.min(selection.fixed.row, selection.moving.row);
    const endRow = Math.max(selection.fixed.row, selection.moving.row);
    const startCol = Math.min(selection.fixed.col, selection.moving.col);
    const endCol = Math.max(selection.fixed.col, selection.moving.col);
    
    const selectedWells = [];
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        selectedWells.push(`${getRowLabel(row)}${col + 1}`);
      }
    }
    return selectedWells;
  };
  
  const plateRef = useRef(null);

  // 2. Update the states
  const [savedPlates, setSavedPlates] = useState<{ [key: string]: SavedPlate }>({});
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPlateName, setNewPlateName] = useState('');

  // Add new state to track active selection edge
  const [activeEdge, setActiveEdge] = useState<'horizontal' | 'vertical' | null>(null);

  // Update state definitions
  const [selection, setSelection] = useState<SelectionState | null>(null);

  // Add new state for selected wells
  const [selectedWells, setSelectedWells] = useState<string[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showTitrationModal, setShowTitrationModal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleKeyDown = (e: KeyboardEvent) => {   
        if (!selection) return;
        
        // Don't prevent default if an input is focused
        if (document.activeElement?.tagName === 'INPUT') return;
    
        const { rows, cols } = PLATE_CONFIGURATIONS[plateType];


        if (e.key === 'Delete'|| e.key === 'Backspace') {
          e.preventDefault();
          const selectedWellIds = getSelectedWells();
          const newWells = { ...wells };
          
          selectedWellIds.forEach(wellId => {
            // Clear all data from the well while preserving the object
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
          
          setWells(newWells);
        }
    
        if (e.shiftKey) {
          e.preventDefault(); // Only prevent default for non-input elements
          const newSelection = { ...selection };
          
          // Store current position before moving
          newSelection.lastMoving = { ...newSelection.moving };
          
          switch (e.key) {
            case 'ArrowLeft':
              if (newSelection.moving.col > 0) {
                // Contract if we were moving right before
                if (newSelection.lastMoving && newSelection.lastMoving.col > newSelection.moving.col) {
                  newSelection.moving.col = Math.max(0, newSelection.moving.col - 1);
                } else {
                  // Expand left
                  newSelection.moving.col = Math.max(0, newSelection.moving.col - 1);
                }
                setActiveEdge('horizontal');
              }
              break;
              
            case 'ArrowRight':
              if (newSelection.moving.col < cols - 1) {
                // Contract if we were moving left before
                if (newSelection.lastMoving && newSelection.lastMoving.col < newSelection.moving.col) {
                  newSelection.moving.col = Math.min(cols - 1, newSelection.moving.col + 1);
                } else {
                  // Expand right
                  newSelection.moving.col = Math.min(cols - 1, newSelection.moving.col + 1);
                }
                setActiveEdge('horizontal');
              }
              break;
              
            // Similar logic for up/down arrows
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
  }, [selection, plateType]);

  // Add clipboard handler
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      if (!selection) return;
      if (document.activeElement?.tagName === 'INPUT') return;
      
      e.preventDefault();
      const selectedWellIds = getSelectedWells();
      const wellData = selectedWellIds.map(wellId => wells[wellId] || {});
      e.clipboardData?.setData('text/plain', JSON.stringify(wellData));
    };
  
    const handlePaste = async (e: ClipboardEvent) => {
      if (!selection) return;
      if (document.activeElement?.tagName === 'INPUT') return;
      
      e.preventDefault();
      const pasteData = e.clipboardData?.getData('text/plain');
      if (!pasteData) return;
  
      try {
        const wellData = JSON.parse(pasteData);
        if (!Array.isArray(wellData)) return;
  
        const targetWellIds = getSelectedWells();
        const newWells = { ...wells };
  
        if (wellData.length === 1) {
          // Paste single well to all selected
          targetWellIds.forEach(wellId => {
            newWells[wellId] = { ...wellData[0] };
          });
        } else {
          // Paste pattern to selection
          targetWellIds.forEach((wellId, index) => {
            if (wellData[index % wellData.length]) {
              newWells[wellId] = { ...wellData[index % wellData.length] };
            }
          });
        }
  
        setWells(newWells);
      } catch (err) {
        console.error('Paste failed:', err);
      }
    };
  
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    
    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [selection, wells, getSelectedWells]);

  useEffect(() => {    
    // Update unique compounds whenever wells change
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
    // Check if the code is running in the browser
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('savedPlates');
      if (saved) {
        setSavedPlates(JSON.parse(saved));
      }
    }
  }, []);

  useEffect(() => {
    if (selection) {
      // Get the first selected well to populate edit fields
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
      // Clear edit fields when deselecting
      setEditData({
        cellType: '',
        compound: '',
        concentration: '',
        concentrationUnits: ''
      });
    }
  }, [selection, wells]);

  const getRowLabel = (index: number): string => {
    return String.fromCharCode(65 + index);
  };
  
  

  // Modified handleMouseDown
  const handleMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    const wellId = `${getRowLabel(row)}${col + 1}`;
    
    if (getSelectedWells().includes(wellId)) {
      setSelection(null);
      return;
    }
    
    setIsSelecting(true);
    if (e.shiftKey && selection) {
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

  // Modified handleMouseMove
  const handleMouseMove = (row: number, col: number) => {
    if (isSelecting) {
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
    const newWells = { ...wells };
    
    selectedWells.forEach(wellId => {
      newWells[wellId] = {
        ...wells[wellId],
        cellType: editData.cellType,
        compound: editData.compound,
        concentration: editData.concentration,
        concentrationUnits: editData.concentrationUnits
      };
    });
    
    setWells(newWells);
    setSelection(null);
  };

  const handleRowSelect = (rowIndex: number) => {
    const { cols } = PLATE_CONFIGURATIONS[plateType];
    setSelection({
      fixed: { row: rowIndex, col: 0 },
      moving: { row: rowIndex, col: cols - 1 }
    });
  };

  const handleColumnSelect = (colIndex: number) => {
    const { rows } = PLATE_CONFIGURATIONS[plateType];
    setSelection({
      fixed: { row: 0, col: colIndex },
      moving: { row: rows - 1, col: colIndex }
    });
  };

  const exportToCSV = () => {
    const { rows, cols } = PLATE_CONFIGURATIONS[plateType];
    let csv = 'Well,Cell Type,Compound,Concentration,Concentration Units\n';
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const wellId = `${getRowLabel(row)}${col + 1}`;
        const well = wells[wellId] || { 
          cellType: '',
          compound: '',
          concentration: '',
          concentrationUnits: ''
        };
        csv += `${wellId},${well.cellType},${well.compound},${well.concentration},${well.concentrationUnits}\n`;
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

  // Modify saveConfiguration function
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

  // Modify loadConfiguration function
  const loadConfiguration = (plateName: string) => {
    const config = savedPlates[plateName];
    if (config) {
      setPlateType(config.plateType);
      setWells(config.wells);
      setShowLoadModal(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto select-none">
      <div className="mb-6 space-y-4">
        <div className="flex space-x-4">
          {/* 3. Update the select element rendering */}
          <select
            value={plateType.toString()}
            onChange={(e) => setPlateType(Number(e.target.value) as keyof typeof PLATE_CONFIGURATIONS)}
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
          onClick={() => setShowClearConfirm(true)}
          className="flex items-center px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
          <Trash className="w-4 h-4 mr-2" /> Clear Saved
          </button>
          
          <button
            onClick={() => setShowLoadModal(true)}
            className="flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            <Upload className="w-4 h-4 mr-2" /> Load
          </button>
          
          <button
            onClick={exportToCSV}
            className="flex items-center px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            <FileDown className="w-4 h-4 mr-2" /> Export CSV
          </button>

          <button
            onClick={() => setShowTitrationModal(true)}
            className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            <Calculator className="w-4 h-4 mr-2" /> Setup Titration
          </button>
        </div>

          {showLoadModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-md w-full">
                <h2 className="text-xl font-bold mb-4">Load Plate Configuration</h2>
                {Object.keys(savedPlates).length === 0 ? (
                  <p>No saved plate configurations found.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.keys(savedPlates).map((plateName) => (
                      <button
                        key={plateName}
                        onClick={() => loadConfiguration(plateName)}
                        className="w-full p-2 border rounded hover:bg-gray-100"
                      >
                        {plateName}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowLoadModal(false)}
                  className="mt-4 w-full p-2 bg-gray-200 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

        <div className="space-y-2">
          <input
            type="text"
            placeholder="Cell Type"
            value={editData.cellType}
            onChange={(e) => setEditData(prev => ({ ...prev, cellType: e.target.value }))}
            className={`p-2 border rounded w-full ${!selection ? 'opacity-50' : ''}`}
            disabled={!selection}
          />
          <input
            type="text"
            placeholder="Compound"
            value={editData.compound}
            onChange={(e) => setEditData(prev => ({ ...prev, compound: e.target.value }))}
            className={`p-2 border rounded w-full ${!selection ? 'opacity-50' : ''}`}
            disabled={!selection}
          />
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Concentration"
              value={editData.concentration}
              onChange={(e) => setEditData(prev => ({ ...prev, concentration: e.target.value }))}
              className={`p-2 border rounded w-full ${!selection ? 'opacity-50' : ''}`}
              disabled={!selection}
            />
            <input
              type="text"
              placeholder="Units"
              value={editData.concentrationUnits}
              onChange={(e) => setEditData(prev => ({ ...prev, concentrationUnits: e.target.value }))}
              className={`p-2 border rounded w-full ${!selection ? 'opacity-50' : ''}`}
              disabled={!selection}
            />
          </div>
          <button
            onClick={handleWellUpdate}
            disabled={!selection}
            className={`px-4 py-2 text-white rounded w-full ${
              selection 
              ? 'bg-blue-500 hover:bg-blue-600' 
              : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {selection ? 'Update Selected Wells' : 'Select Wells to Update'}
          </button>
        </div>

        {/* Compound Color Legend */}
        {/* 5. Update compound legend rendering */}
        {uniqueCompounds.size > 0 && (
          <div className="mt-4 p-4 border rounded">
            <h3 className="font-bold mb-2">Compound Legend</h3>
            <div className="flex flex-wrap gap-2">
              {[...uniqueCompounds].map((compound: string) => (
                <div
                  key={compound}
                  className="flex items-center space-x-2 px-2 py-1 rounded"
                  style={{ backgroundColor: getCompoundColor(compound) }}
                >
                  {compound}
                </div>
              ))}
            </div>
          </div>
        )}
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
            if (selection) {
              setSelection(null);
            } else {
              setSelection({
                fixed: { row: 0, col: 0 },
                moving: { row: rows - 1, col: cols - 1 }
              });
            }
          }}
        >
          ☐
        </div> 
          <div className="flex">
            <div className="w-8" /> {/* Spacer for row labels */}
            {[...Array(PLATE_CONFIGURATIONS[plateType].cols)].map((_, colIndex) => (
              <div
                key={colIndex}
                className="w-16 h-8 flex items-center justify-center cursor-pointer hover:bg-gray-100"
                onClick={() => handleColumnSelect(colIndex)}
              >
                {colIndex + 1}
              </div>
            ))}
          </div>

          {/* 4. Update Array mapping for wells */}
          {Array.from({length: PLATE_CONFIGURATIONS[plateType].rows}).map((_, rowIndex) => (
            <div key={rowIndex} className="flex">
              <div
                className="w-8 h-16 flex items-center justify-center cursor-pointer hover:bg-gray-100"
                onClick={() => handleRowSelect(rowIndex)}
              >
                {String.fromCharCode(65 + rowIndex)}
              </div>
              {Array.from({length: PLATE_CONFIGURATIONS[plateType].cols}).map((_, colIndex) => {
                const wellId = `${String.fromCharCode(65 + rowIndex)}${colIndex + 1}`;
                const well: Well = wells[wellId] || {};
                const isSelected = getSelectedWells().includes(wellId);
                const backgroundColor = well.compound ? getCompoundColor(well.compound) : 'white';
                
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`w-16 h-16 border border-gray-300 cursor-pointer relative overflow-hidden`}
                    onMouseDown={(e) => handleMouseDown(rowIndex, colIndex, e)}
                    onMouseMove={() => handleMouseMove(rowIndex, colIndex)}
                    onMouseUp={handleMouseUp}
                  >
                    <div 
                      className="absolute inset-0" 
                      style={{ backgroundColor }}
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-blue-500 opacity-30" />
                    )}
                    <div className="absolute inset-0 p-1 text-xs overflow-hidden">
                      {well.cellType && <span className="block truncate">{well.cellType}</span>}
                      {well.compound && <span className="block truncate">{well.compound}</span>}
                      {well.concentration && (
                        <span className="block truncate">
                          {well.concentration} {well.concentrationUnits}
                        </span>
                      )}
                    </div>
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

      {/* Add Clear Saved confirmation modal JSX */}
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
                // Apply titration results to wells
                const newWells = { ...wells };
                results.forEach(result => {
                  newWells[result.wellId] = {
                    ...wells[result.wellId],
                    compound: result.compound,
                    concentration: result.concentration.toString(),
                    concentrationUnits: result.units,
                    dilutionStep: result.dilutionStep,
                    replicate: result.replicate,
                    titrationId: result.titrationId
                  };
                });
                setWells(newWells);
                setShowTitrationModal(false);
              }}
              onCancel={() => setShowTitrationModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AssayPlateDesigner;