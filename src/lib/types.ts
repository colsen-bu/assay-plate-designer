/**
 * Shared types for the Assay Plate Designer
 */

export const PLATE_CONFIGURATIONS = {
  6: { rows: 2, cols: 3 },
  12: { rows: 3, cols: 4 },
  24: { rows: 4, cols: 6 },
  48: { rows: 6, cols: 8 },
  96: { rows: 8, cols: 12 },
  384: { rows: 16, cols: 24 }
} as const;

export type PlateConfigurations = typeof PLATE_CONFIGURATIONS;

export interface Well {
  cellType?: string;
  compound?: string;
  concentration?: string;
  concentrationUnits?: string;
  dilutionStep?: number;
  replicate?: number;
  titrationId?: string;
}

export interface SavedPlate {
  plateType: keyof PlateConfigurations;
  wells: Record<string, Well>;
}

export interface SelectionEdge {
  row: number;
  col: number;
}

export interface SelectionState {
  fixed: SelectionEdge;
  moving: SelectionEdge;
  lastMoving?: SelectionEdge;
}
