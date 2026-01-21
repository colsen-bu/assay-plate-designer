/**
 * Plate Notation (PN) - A compact, human-readable format for sharing plate configurations
 * Similar to FEN notation in chess, this allows easy URL-based sharing without encryption
 * 
 * Format: PN:v[version]/[plateType]/[well-data]
 * 
 * Well data format: wellId:cellType-compound-concentration-units-replicate
 * Wells are separated by asterisks (*), empty fields are omitted
 * 
 * Example: PN:v1/96/A1:CT1-CompA-10-uM-1*A2:CT1-CompA-5-uM-1
 */

import type { Well, PlateConfigurations } from './types';

const PN_VERSION = 1;
const FIELD_SEPARATOR = '-';
const WELL_SEPARATOR = '*';
const PN_PREFIX = 'PN:v';

// Characters that need escaping in the notation
const ESCAPE_MAP: Record<string, string> = {
  '-': '~d',
  '*': '~a',
  '~': '~~',
};

/**
 * Escape special characters in a field value
 */
function escapeField(value: string): string {
  return value.replace(/[~\-*]/g, (char) => ESCAPE_MAP[char] || char);
}

/**
 * Encode a well's data into a compact string
 * Format: wellId:cellType-compound-concentration-units-replicate
 * Empty trailing fields are omitted
 */
function encodeWell(wellId: string, well: Well): string | null {
  // Skip completely empty wells
  if (!well.cellType && !well.compound && !well.concentration) {
    return null;
  }

  const fields = [
    well.cellType || '',
    well.compound || '',
    well.concentration || '',
    well.concentrationUnits || '',
    well.replicate?.toString() || '',
  ];

  // Remove trailing empty fields
  while (fields.length > 0 && fields[fields.length - 1] === '') {
    fields.pop();
  }

  if (fields.length === 0) {
    return null;
  }

  const escapedFields = fields.map(escapeField);
  return `${wellId}:${escapedFields.join(FIELD_SEPARATOR)}`;
}

/**
 * Decode a well string back into wellId and Well data
 */
function decodeWell(wellStr: string): { wellId: string; well: Well } | null {
  const colonIndex = wellStr.indexOf(':');
  if (colonIndex === -1) {
    return null;
  }

  const wellId = wellStr.substring(0, colonIndex);
  const dataStr = wellStr.substring(colonIndex + 1);

  // Parse fields, handling escaped characters
  const fields: string[] = [];
  let currentField = '';
  let i = 0;

  while (i < dataStr.length) {
    if (dataStr[i] === '~' && i + 1 < dataStr.length) {
      // Escaped character - check what it is
      const escapeSeq = dataStr.substring(i, i + 2);
      if (escapeSeq === '~d') {
        currentField += '-';
        i += 2;
      } else if (escapeSeq === '~a') {
        currentField += '*';
        i += 2;
      } else if (escapeSeq === '~~') {
        currentField += '~';
        i += 2;
      } else {
        currentField += dataStr[i];
        i++;
      }
    } else if (dataStr[i] === FIELD_SEPARATOR) {
      fields.push(currentField);
      currentField = '';
      i++;
    } else {
      currentField += dataStr[i];
      i++;
    }
  }
  fields.push(currentField); // Add last field

  const well: Well = {
    cellType: fields[0] || undefined,
    compound: fields[1] || undefined,
    concentration: fields[2] || undefined,
    concentrationUnits: fields[3] || undefined,
    replicate: fields[4] ? parseInt(fields[4], 10) : undefined,
  };

  // Clean up undefined values
  Object.keys(well).forEach((key) => {
    if (well[key as keyof Well] === undefined || well[key as keyof Well] === '') {
      delete well[key as keyof Well];
    }
  });

  return { wellId, well };
}

export interface PlateNotationData {
  version: number;
  plateType: keyof PlateConfigurations;
  wells: Record<string, Well>;
}

/**
 * Encode plate data into Plate Notation (PN) format
 */
export function encodePlateNotation(
  plateType: keyof PlateConfigurations,
  wells: Record<string, Well>
): string {
  const wellStrings: string[] = [];

  // Sort wells by row then column for consistent ordering
  const sortedWellIds = Object.keys(wells).sort((a, b) => {
    const rowA = a.charCodeAt(0);
    const rowB = b.charCodeAt(0);
    if (rowA !== rowB) return rowA - rowB;
    
    const colA = parseInt(a.substring(1), 10);
    const colB = parseInt(b.substring(1), 10);
    return colA - colB;
  });

  for (const wellId of sortedWellIds) {
    const well = wells[wellId];
    const encoded = encodeWell(wellId, well);
    if (encoded) {
      wellStrings.push(encoded);
    }
  }

  const wellData = wellStrings.join(WELL_SEPARATOR);
  return `${PN_PREFIX}${PN_VERSION}/${plateType}/${wellData}`;
}

/**
 * Decode Plate Notation (PN) string back into plate data
 */
export function decodePlateNotation(notation: string): PlateNotationData | null {
  // Validate prefix
  if (!notation.startsWith(PN_PREFIX)) {
    return null;
  }

  try {
    const withoutPrefix = notation.substring(PN_PREFIX.length);
    const parts = withoutPrefix.split('/');
    
    if (parts.length < 2) {
      return null;
    }

    const version = parseInt(parts[0], 10);
    if (isNaN(version) || version < 1) {
      return null;
    }

    const plateType = parseInt(parts[1], 10) as keyof PlateConfigurations;
    if (![6, 12, 24, 48, 96, 384].includes(plateType)) {
      return null;
    }

    const wells: Record<string, Well> = {};

    // Handle case where there's well data
    if (parts.length >= 3 && parts[2]) {
      const wellStrings = parts[2].split(WELL_SEPARATOR);
      
      for (const wellStr of wellStrings) {
        if (!wellStr.trim()) continue;
        
        const decoded = decodeWell(wellStr);
        if (decoded) {
          wells[decoded.wellId] = decoded.well;
        }
      }
    }

    return { version, plateType, wells };
  } catch (error) {
    console.error('Failed to decode plate notation:', error);
    return null;
  }
}

/**
 * Create a shareable URL with plate notation in the hash
 */
export function createShareUrl(
  plateType: keyof PlateConfigurations,
  wells: Record<string, Well>,
  baseUrl?: string
): string {
  const notation = encodePlateNotation(plateType, wells);
  const encoded = encodeURIComponent(notation);
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '');
  return `${base}#pn=${encoded}`;
}

/**
 * Parse plate notation from URL hash
 */
export function parseShareUrl(url?: string): PlateNotationData | null {
  const hash = url || (typeof window !== 'undefined' ? window.location.hash : '');
  
  if (!hash || !hash.includes('pn=')) {
    return null;
  }

  try {
    const pnParam = hash.split('pn=')[1];
    if (!pnParam) return null;
    
    // Handle any additional hash parameters
    const notation = decodeURIComponent(pnParam.split('&')[0]);
    return decodePlateNotation(notation);
  } catch (error) {
    console.error('Failed to parse share URL:', error);
    return null;
  }
}

/**
 * Get statistics about the notation
 */
export function getNotationStats(notation: string): {
  charCount: number;
  wellCount: number;
  estimatedQrVersion: number;
} {
  const charCount = notation.length;
  const wellData = notation.split('/')[2] || '';
  const wellCount = wellData ? wellData.split(WELL_SEPARATOR).length : 0;
  
  // Estimate QR version needed (rough approximation)
  let estimatedQrVersion: number;
  if (charCount <= 25) estimatedQrVersion = 1;
  else if (charCount <= 47) estimatedQrVersion = 2;
  else if (charCount <= 77) estimatedQrVersion = 3;
  else if (charCount <= 114) estimatedQrVersion = 4;
  else if (charCount <= 154) estimatedQrVersion = 5;
  else if (charCount <= 195) estimatedQrVersion = 6;
  else if (charCount <= 367) estimatedQrVersion = 8;
  else if (charCount <= 652) estimatedQrVersion = 11;
  else if (charCount <= 1273) estimatedQrVersion = 17;
  else estimatedQrVersion = 25; // Larger plates may need high-capacity QR

  return { charCount, wellCount, estimatedQrVersion };
}
