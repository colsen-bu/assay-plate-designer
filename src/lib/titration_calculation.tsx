import React, { useState } from 'react';

interface TitrationParams {
  startConcentration: number;
  units: string;
  dilutionFactor: number;
  numPoints: number;
  direction: 'vertical' | 'horizontal';
  startWell: string;
  replicates: number;
  compound: string;
}

interface TitrationResult {
  wellId: string;
  concentration: string;
  units: string;
  compound: string;
  dilutionStep: number;
  replicate: number;
  titrationId: string;
}

interface TitrationCalculatorProps {
  onCalculate: (results: TitrationResult[]) => void;
  onCancel: () => void;
}

export const TitrationCalculator: React.FC<TitrationCalculatorProps> = ({ onCalculate, onCancel }) => {
  const [params, setParams] = useState<TitrationParams>({
    startConcentration: 100,
    units: 'µM',
    dilutionFactor: 2,
    numPoints: 8,
    direction: 'horizontal',
    startWell: 'A1',
    replicates: 1,
    compound: ''
  });

  const [customDilutionFactor, setCustomDilutionFactor] = useState<string>("");
  const [isCustomDilution, setIsCustomDilution] = useState(false);

  const PRESET_DILUTIONS = [
    { label: '2-fold', value: 2 },
    { label: '3-fold', value: 3 },
    { label: '4-fold', value: 4 },
    { label: '5-fold', value: 5 },
    { label: '10-fold', value: 10 },
    { label: 'Half-log (3.16-fold)', value: 3.16 },
    { label: 'Custom', value: 'custom' }
  ];

  const handleDilutionChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomDilution(true);
      setParams(p => ({ ...p, dilutionFactor: Number(customDilutionFactor) || 2 }));
    } else {
      setIsCustomDilution(false);
      setParams(p => ({ ...p, dilutionFactor: Number(value) }));
    }
  };

  const calculateSeries = (params: TitrationParams): TitrationResult[] => {
    const results: TitrationResult[] = [];
    const startRow = params.startWell.charAt(0).charCodeAt(0) - 65;
    const startCol = parseInt(params.startWell.slice(1)) - 1;
    const titrationId = `titration-${Date.now()}`;

    for (let replicate = 0; replicate < params.replicates; replicate++) {
      for (let point = 0; point < params.numPoints; point++) {
        const concentration = (params.startConcentration * Math.pow(1/params.dilutionFactor, point)).toString();
        
        let row = startRow;
        let col = startCol;
        
        if (params.direction === 'vertical') {
          row += point;
          row += replicate * params.numPoints;
        } else {
          col += point;
          row += replicate;
        }
  
        const wellId = `${String.fromCharCode(65 + row)}${col + 1}`;
  
        results.push({
          wellId,
          concentration,
          units: params.units,
          compound: params.compound,
          dilutionStep: point,
          replicate,
          titrationId // Add the titration ID
        });
      }
    }
    return results;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const results = calculateSeries(params);
    onCalculate(results);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
      <label className="block">
          Compound:
          <input
            type="text"
            value={params.compound}
            onChange={e => setParams(p => ({ ...p, compound: e.target.value }))}
            className="w-full p-2 border rounded"
            required
          />
        </label>
        <label className="block">
          Start Concentration:
          <input
            type="number"
            value={params.startConcentration}
            onChange={e => setParams(p => ({ ...p, startConcentration: Number(e.target.value) }))}
            className="w-full p-2 border rounded"
            required
          />
        </label>
        <label className="block">
          Units:
          <input
            type="text"
            value={params.units}
            onChange={e => setParams(p => ({ ...p, units: e.target.value }))}
            className="w-full p-2 border rounded"
            required
          />
        </label>
        <label className="block">
          Dilution Factor:
          <select
            value={isCustomDilution ? 'custom' : params.dilutionFactor}
            onChange={e => handleDilutionChange(e.target.value)}
            className="w-full p-2 border rounded"
          >
            {PRESET_DILUTIONS.map(({ label, value }) => (
              <option key={label} value={value}>{label}</option>
            ))}
          </select>
        </label>
        {isCustomDilution && (
          <label className="block">
            Custom Dilution Factor:
            <input
              type="number"
              value={customDilutionFactor}
              onChange={e => {
                setCustomDilutionFactor(e.target.value);
                setParams(p => ({ ...p, dilutionFactor: Number(e.target.value) }));
              }}
              className="w-full p-2 border rounded"
              min="1.1"
              step="0.01"
              required
            />
          </label>
        )}
        <label className="block">
          Number of Points:
          <input
            type="number"
            value={params.numPoints}
            onChange={e => setParams(p => ({ ...p, numPoints: Number(e.target.value) }))}
            className="w-full p-2 border rounded"
            min="2"
            required
          />
        </label>
        <label className="block">
          Direction:
          <select
            value={params.direction}
            onChange={e => setParams(p => ({ ...p, direction: e.target.value as 'horizontal' | 'vertical' }))}
            className="w-full p-2 border rounded"
          >
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </label>
        <label className="block">
          Start Well:
          <input
            type="text"
            value={params.startWell}
            onChange={e => setParams(p => ({ ...p, startWell: e.target.value }))}
            className="w-full p-2 border rounded"
            pattern="[A-Z][0-9]+"
            required
          />
        </label>
        <label className="block">
          Replicates:
          <input
            type="number"
            value={params.replicates}
            onChange={e => setParams(p => ({ ...p, replicates: Number(e.target.value) }))}
            className="w-full p-2 border rounded"
            min="1"
            required
          />
        </label>
      </div>
      <div className="flex space-x-2">
        <button
          type="submit"
          className="flex-1 p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Calculate
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 p-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export type { TitrationParams, TitrationResult };