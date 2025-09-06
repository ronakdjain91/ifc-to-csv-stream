import * as THREE from 'three';

export interface IFCElement {
  id: string;
  type: string;
  name: string;
  level?: string;
  properties: Record<string, any>;
  geometry?: THREE.BufferGeometry;
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  material?: THREE.Material;
}

export interface IFCLevel {
  id: string;
  name: string;
  elevation: number;
  elements: IFCElement[];
}

export interface IFCQuantity {
  type: string;
  count: number;
  totalArea?: number;
  totalVolume?: number;
  elements: IFCElement[];
}

export interface IFCModel {
  elements: IFCElement[];
  levels: IFCLevel[];
  quantities: {
    byType: Record<string, IFCQuantity>;
    byLevel: Record<string, IFCQuantity>;
  };
}

export const parseIFCFile3D = async (file: File): Promise<IFCModel> => {
  // Dynamically read up to 1MB if needed to find enough entities
  const MAX_TOTAL = 1024 * 1024;
  const CHUNK = 200 * 1024;

  const readChunk = (size: number) => new Promise<IFCModel>((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const model = parseIFCContent3D(content);
      resolve(model);
    };
    const slice = file.slice(0, Math.min(file.size, size));
    reader.readAsText(slice);
  });

  let size = Math.min(CHUNK, file.size);
  let model = await readChunk(size);
  // If too few elements parsed, expand read size cautiously
  while (model.elements.length < 10 && size < Math.min(MAX_TOTAL, file.size)) {
    size = Math.min(size + CHUNK, Math.min(MAX_TOTAL, file.size));
    model = await readChunk(size);
  }
  return model;
};

const parseIFCContent3D = (content: string): IFCModel => {
  const elements: IFCElement[] = [];
  const levels: IFCLevel[] = [];
  // Split into complete entities (may span multiple lines)
  const records = splitIFCEntities3D(content).slice(0, 200);

  // Create sample levels
  const sampleLevels = [
    { id: 'L1', name: 'Ground Floor', elevation: 0 },
    { id: 'L2', name: 'First Floor', elevation: 3000 },
  ];
  
  // Parse only important IFC types for performance
  const importantTypes = ['IFCWALL', 'IFCDOOR', 'IFCWINDOW', 'IFCCOLUMN', 'IFCBEAM'];
  
  for (let i = 0; i < records.length && elements.length < 100; i++) {
    const rec = records[i];
    if (!rec.startsWith('#')) continue;
    const hasImportantType = importantTypes.some(type => rec.includes(type));
    if (!hasImportantType) continue;
    const element = parseIFCLine3D(rec, i);
    if (element) {
      const level = sampleLevels[i % 2];
      element.level = level.name;
      element.position = new THREE.Vector3(
        (i % 5 - 2) * 2,
        level.elevation / 1000,
        Math.floor(i / 5) * 2 - 4
      );
      elements.push(element);
    }
  }
  
  // Create levels with elements
  sampleLevels.forEach(levelData => {
    const levelElements = elements.filter(el => el.level === levelData.name);
    levels.push({
      id: levelData.id,
      name: levelData.name,
      elevation: levelData.elevation,
      elements: levelElements
    });
  });
  
  // Generate quantities
  const quantitiesByType: Record<string, IFCQuantity> = {};
  const quantitiesByLevel: Record<string, IFCQuantity> = {};
  
  elements.forEach(element => {
    // By type
    if (!quantitiesByType[element.type]) {
      quantitiesByType[element.type] = {
        type: element.type,
        count: 0,
        totalArea: 0,
        totalVolume: 0,
        elements: []
      };
    }
    quantitiesByType[element.type].count++;
    quantitiesByType[element.type].totalArea += element.properties.area || 0;
    quantitiesByType[element.type].totalVolume += element.properties.volume || 0;
    quantitiesByType[element.type].elements.push(element);
    
    // By level
    const levelName = element.level || 'Unknown';
    if (!quantitiesByLevel[levelName]) {
      quantitiesByLevel[levelName] = {
        type: levelName,
        count: 0,
        totalArea: 0,
        totalVolume: 0,
        elements: []
      };
    }
    quantitiesByLevel[levelName].count++;
    quantitiesByLevel[levelName].totalArea += element.properties.area || 0;
    quantitiesByLevel[levelName].totalVolume += element.properties.volume || 0;
    quantitiesByLevel[levelName].elements.push(element);
  });
  
  return {
    elements,
    levels,
    quantities: {
      byType: quantitiesByType,
      byLevel: quantitiesByLevel
    }
  };
};

const parseIFCLine3D = (line: string, index: number): IFCElement | null => {
  try {
    const match = line.match(/#(\d+)\s*=\s*(\w+)\s*\(([\s\S]*)\);?/);
    if (!match) return null;
    
    const [, id, type, params] = match;
    const paramList = splitTopLevelParams3D(params);
    
    const element: IFCElement = {
      id,
      type,
      name: extractStringValue(paramList[0]) || `${type}_${id}`,
      properties: {}
    };
    
    // Create 3D geometry based on type
    element.geometry = createGeometryForType(type);
    element.material = createMaterialForType(type);
    element.rotation = new THREE.Euler(0, Math.random() * Math.PI * 2, 0);
    
    // Add type-specific properties
    switch (type) {
      case 'IFCWALL':
        element.properties.height = extractNumericValue(paramList[1]) || 3000;
        element.properties.thickness = extractNumericValue(paramList[2]) || 200;
        element.properties.area = (element.properties.height * element.properties.thickness) / 1000000;
        break;
      case 'IFCDOOR':
        element.properties.width = extractNumericValue(paramList[1]) || 800;
        element.properties.height = extractNumericValue(paramList[2]) || 2100;
        element.properties.area = (element.properties.width * element.properties.height) / 1000000;
        break;
      case 'IFCWINDOW':
        element.properties.width = extractNumericValue(paramList[1]) || 1200;
        element.properties.height = extractNumericValue(paramList[2]) || 1500;
        element.properties.area = (element.properties.width * element.properties.height) / 1000000;
        break;
      case 'IFCSPACE':
        element.properties.area = extractNumericValue(paramList[1]) || 25;
        element.properties.volume = extractNumericValue(paramList[2]) || 75;
        break;
      default:
        element.properties.area = Math.random() * 10 + 1;
        element.properties.volume = Math.random() * 20 + 5;
        break;
    }
    
    return element;
  } catch (error) {
    return null;
  }
};

// Cache shared geometries and materials to avoid allocations per element
const geometryCache: Record<string, THREE.BufferGeometry> = {};
const materialCache: Record<string, THREE.Material> = {};

const createGeometryForType = (type: string): THREE.BufferGeometry => {
  if (geometryCache[type]) return geometryCache[type];

  let geometry: THREE.BufferGeometry;
  switch (type) {
    case 'IFCWALL':
      geometry = new THREE.BoxGeometry(0.1, 1.5, 2);
      break;
    case 'IFCDOOR':
      geometry = new THREE.BoxGeometry(0.05, 1, 0.4);
      break;
    case 'IFCWINDOW':
      geometry = new THREE.BoxGeometry(0.02, 0.8, 0.6);
      break;
    case 'IFCCOLUMN':
      geometry = new THREE.BoxGeometry(0.1, 1.5, 0.1);
      break;
    case 'IFCBEAM':
      geometry = new THREE.BoxGeometry(2, 0.15, 0.15);
      break;
    default:
      geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      break;
  }
  geometryCache[type] = geometry;
  return geometry;
};

const createMaterialForType = (type: string): THREE.Material => {
  if (materialCache[type]) return materialCache[type];

  const materials: Record<string, number> = {
    IFCWALL: 0x8B4513,
    IFCDOOR: 0x654321,
    IFCWINDOW: 0x87CEEB,
    IFCSPACE: 0x90EE90,
    IFCCOLUMN: 0x808080,
    IFCBEAM: 0x8B4513,
    default: 0x888888
  };

  const base = new THREE.MeshBasicMaterial({
    color: materials[type] || materials.default,
    transparent: type === 'IFCWINDOW',
    opacity: type === 'IFCWINDOW' ? 0.6 : 1
  });
  materialCache[type] = base;
  return base;
};

const extractStringValue = (param: string): string | null => {
  const match = param?.match(/'(?:''|[^'])*'/);
  if (!match) return null;
  return match[0].slice(1, -1).replace(/''/g, "'");
};

const extractNumericValue = (param: string): number | null => {
  const num = parseFloat(param?.replace(/[^\d.-]/g, '') || '');
  return isNaN(num) ? null : num;
};

// Utilities for multi-line entity splitting and param splitting
const splitIFCEntities3D = (content: string): string[] => {
  const result: string[] = [];
  let buf = '';
  let depth = 0;
  let inString = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];
    if (ch === "'" && (!inString || next !== "'")) { inString = !inString; buf += ch; continue; }
    if (inString && ch === "'" && next === "'") { buf += "''"; i++; continue; }
    if (!inString) {
      if (ch === '(') depth++;
      else if (ch === ')') depth = Math.max(0, depth - 1);
    }
    buf += ch;
    if (!inString && ch === ';' && depth === 0) { result.push(buf.trim()); buf = ''; }
  }
  if (buf.trim()) result.push(buf.trim());
  return result;
};

const splitTopLevelParams3D = (text: string): string[] => {
  const parts: string[] = [];
  let buf = '';
  let depth = 0;
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === "'" && (!inString || next !== "'")) { inString = !inString; buf += ch; continue; }
    if (inString && ch === "'" && next === "'") { buf += "''"; i++; continue; }
    if (!inString) {
      if (ch === '(') depth++;
      else if (ch === ')') depth = Math.max(0, depth - 1);
      else if (ch === ',' && depth === 0) { parts.push(buf.trim()); buf = ''; continue; }
    }
    buf += ch;
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
};