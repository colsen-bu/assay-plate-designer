"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Save, FileDown, Upload } from 'lucide-react';

const PLATE_CONFIGURATIONS = {
  6: { rows: 2, cols: 3 },
  12: { rows: 3, cols: 4 },
  24: { rows: 4, cols: 6 },
  48: { rows: 6, cols: 8 },
  96: { rows: 8, cols: 12 },
  384: { rows: 16, cols: 24 }
};

// Function to generate a consistent color for a compound name
const getCompoundColor = (compound) => {
  if (!compound) return null;
  
  // Basic hash function to generate a number from a string
  const hash = compound.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  // Generate HSL color with consistent saturation and lightness
  const hue = Math.abs(hash % 360);
  return `hsla(${hue}, 70%, 85%, 0.8)`;
};

const AssayPlateDesigner = () => {
  const [plateType, setPlateType] = useState(96);
  const [wells, setWells] = useState({});
  const [selection, setSelection] = useState({ start: null, current: null });
  const [isSelecting, setIsSelecting] = useState(false);
  const [editData, setEditData] = useState({
    cellType: '',
    compound: '',
    concentration: '',
    concentrationUnits: ''
  });
  const [uniqueCompounds, setUniqueCompounds] = useState(new Set());
  
  const plateRef = useRef(null);

  const [savedPlates, setSavedPlates] = useState(() => {
  const saved = localStorage.getItem('savedPlates');
  return saved ? JSON.parse(saved) : {};
  });
  const [showLoadModal, setShowLoadModal] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selection.start) return;
  
      const { rows, cols } = PLATE_CONFIGURATIONS[plateType];
  
      if (e.shiftKey) {
        let newSelection = { ...selection };
  
        // If selecting an entire row
        if (selection.start.col === 0 && selection.current.col === cols - 1) {
          switch (e.key) {
            case 'ArrowUp':
              e.preventDefault();
              newSelection.start.row = Math.max(0, selection.start.row - 1);
              break;
            case 'ArrowDown':
              e.preventDefault();
              newSelection.current.row = Math.min(rows - 1, selection.current.row + 1);
              break;
          }
        }
  
        // If selecting an entire column
        if (selection.start.row === 0 && selection.current.row === rows - 1) {
          switch (e.key) {
            case 'ArrowLeft':
              e.preventDefault();
              newSelection.start.col = Math.max(0, selection.start.col - 1);
              break;
            case 'ArrowRight':
              e.preventDefault();
              newSelection.current.col = Math.min(cols - 1, selection.current.col + 1);
              break;
          }
        }
  
        setSelection(newSelection);
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, plateType]);

  useEffect(() => {    
    // Update unique compounds whenever wells change
    const compounds = new Set();
    Object.values(wells).forEach(well => {
      if (well.compound) {
        compounds.add(well.compound);
      }
    });
    setUniqueCompounds(compounds);
  }, [wells]);

  const getRowLabel = (index) => String.fromCharCode(65 + index);
  
  const getSelectedWells = () => {
    if (!selection.start || !selection.current) return [];
    
    const startRow = Math.min(selection.start.row, selection.current.row);
    const endRow = Math.max(selection.start.row, selection.current.row);
    const startCol = Math.min(selection.start.col, selection.current.col);
    const endCol = Math.max(selection.start.col, selection.current.col);
    
    const selectedWells = [];
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        selectedWells.push(`${getRowLabel(row)}${col + 1}`);
      }
    }
    return selectedWells;
  };

  const handleMouseDown = (row, col) => {
    setIsSelecting(true);
    setSelection({
      start: { row, col },
      current: { row, col }
    });
  };

  const handleMouseMove = (row, col) => {
    if (isSelecting) {
      setSelection(prev => ({
        ...prev,
        current: { row, col }
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
        cellType: editData.cellType,
        compound: editData.compound,
        concentration: editData.concentration,
        concentrationUnits: editData.concentrationUnits
      };
    });
    
    setWells(newWells);
    setSelection({ start: null, current: null });
  };

  const handleRowSelect = (rowIndex) => {
    const { cols } = PLATE_CONFIGURATIONS[plateType];
    setSelection({
      start: { row: rowIndex, col: 0 },
      current: { row: rowIndex, col: cols - 1 }
    });
  };

  const handleColumnSelect = (colIndex) => {
    const { rows } = PLATE_CONFIGURATIONS[plateType];
    setSelection({
      start: { row: 0, col: colIndex },
      current: { row: rows - 1, col: colIndex }
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
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plate_config.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Modify saveConfiguration function
  const saveConfiguration = () => {
    const plateName = prompt('Enter a name for this plate configuration:');
    if (plateName) {
      const updatedSavedPlates = {
        ...savedPlates,
        [plateName]: { plateType, wells }
      };
      
      setSavedPlates(updatedSavedPlates);
      localStorage.setItem('savedPlates', JSON.stringify(updatedSavedPlates));
    }
  };

  // Modify loadConfiguration function
  const loadConfiguration = (plateName) => {
    const config = savedPlates[plateName];
    if (config) {
      setPlateType(config.plateType);
      setWells(config.wells);
      setShowLoadModal(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 space-y-4">
        <div className="flex space-x-4">
          <select
            value={plateType}
            onChange={(e) => setPlateType(Number(e.target.value))}
            className="p-2 border rounded"
          >
            {Object.keys(PLATE_CONFIGURATIONS).map(type => (
              <option key={type} value={type}>{type}-well plate</option>
            ))}
          </select>
          
          <button
            onClick={saveConfiguration}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <Save className="w-4 h-4 mr-2" /> Save
          </button>

          <button
          onClick={() => {
            localStorage.removeItem('savedPlates');
            setSavedPlates({});
          }}
          className="flex items-center px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
          Clear Saved
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

        {selection.start && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Cell Type"
              value={editData.cellType}
              onChange={(e) => setEditData(prev => ({ ...prev, cellType: e.target.value }))}
              className="p-2 border rounded w-full"
            />
            <input
              type="text"
              placeholder="Compound"
              value={editData.compound}
              onChange={(e) => setEditData(prev => ({ ...prev, compound: e.target.value }))}
              className="p-2 border rounded w-full"
            />
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Concentration"
                value={editData.concentration}
                onChange={(e) => setEditData(prev => ({ ...prev, concentration: e.target.value }))}
                className="p-2 border rounded w-full"
              />
              <input
                type="text"
                placeholder="Units"
                value={editData.concentrationUnits}
                onChange={(e) => setEditData(prev => ({ ...prev, concentrationUnits: e.target.value }))}
                className="p-2 border rounded w-full"
              />
            </div>
            <button
              onClick={handleWellUpdate}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-full"
            >
              Update Selected Wells
            </button>
          </div>
        )}
        {/* Compound Color Legend */}
        {uniqueCompounds.size > 0 && (
          <div className="mt-4 p-4 border rounded">
            <h3 className="font-bold mb-2">Compound Legend</h3>
            <div className="flex flex-wrap gap-2">
              {Array.from(uniqueCompounds).map(compound => (
                <div
                  key={compound}
                  className="flex items-center space-x-2 px-2 py-1 rounded"
                  style={{ backgroundColor: getCompoundColor(compound) }}
                >
                  <span>{compound}</span>
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
            if (selection.start && selection.current) {
              setSelection({ start: null, current: null });
            } else {
              setSelection({
                start: { row: 0, col: 0 },
                current: { row: rows - 1, col: cols - 1 }
              });
            }
          }}
        >
          ☐
        </div> 
          <div className="flex">
            <div className="w-8" /> {/* Spacer for row labels */}
            {Array.from({ length: PLATE_CONFIGURATIONS[plateType].cols }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="w-16 h-8 flex items-center justify-center cursor-pointer hover:bg-gray-100"
                onClick={() => handleColumnSelect(colIndex)}
              >
                {colIndex + 1}
              </div>
            ))}
          </div>

          {Array.from({ length: PLATE_CONFIGURATIONS[plateType].rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex">
              <div
                className="w-8 h-16 flex items-center justify-center cursor-pointer hover:bg-gray-100"
                onClick={() => handleRowSelect(rowIndex)}
              >
                {getRowLabel(rowIndex)}
              </div>
              {Array.from({ length: PLATE_CONFIGURATIONS[plateType].cols }).map((_, colIndex) => {
                const wellId = `${getRowLabel(rowIndex)}${colIndex + 1}`;
                const well = wells[wellId] || {};
                const isSelected = getSelectedWells().includes(wellId);
                const backgroundColor = well.compound ? getCompoundColor(well.compound) : 'white';
                
                return (
                  <div
                    key={colIndex}
                    className={`w-16 h-16 border border-gray-300 cursor-pointer relative overflow-hidden`}
                    onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
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
                      {well.cellType && <div className="truncate">{well.cellType}</div>}
                      {well.compound && <div className="truncate">{well.compound}</div>}
                      {well.concentration && (
                        <div className="truncate">
                          {well.concentration} {well.concentrationUnits}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AssayPlateDesigner;