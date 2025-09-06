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
  return new Promise((resolve) => {
    const reader = new FileReader();
    const MAX_BYTES = 200 * 1024; // Read only first 200KB to avoid heavy main-thread work

    reader.onload = (e) => {
      const content = e.target?.result as string;
      const model = parseIFCContent3D(content);
      resolve(model);
    };

    const slice = file.slice(0, Math.min(file.size, MAX_BYTES));
    reader.readAsText(slice);
  });
};

const parseIFCContent3D = (content: string): IFCModel => {
  const elements: IFCElement[] = [];
  const levels: IFCLevel[] = [];
  const lines = content.split('\n').slice(0, 50); // Limit to first 50 lines for performance
  
  // Create sample levels
  const sampleLevels = [
    { id: 'L1', name: 'Ground Floor', elevation: 0 },
    { id: 'L2', name: 'First Floor', elevation: 3000 },
  ];
  
  // Parse only important IFC types for performance
  const importantTypes = ['IFCWALL', 'IFCDOOR', 'IFCWINDOW', 'IFCCOLUMN', 'IFCBEAM'];
  
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const line = lines[i];
    if (line.trim().startsWith('#')) {
      // Check if line contains important types
      const hasImportantType = importantTypes.some(type => line.includes(type));
      if (hasImportantType) {
        const element = parseIFCLine3D(line, i);
        if (element) {
          // Assign to level
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
    const match = line.match(/#(\d+)\s*=\s*(\w+)\s*\((.*)\);?/);
    if (!match) return null;
    
    const [, id, type, params] = match;
    const paramList = params.split(',').map(p => p.trim());
    
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
  const match = param?.match(/'([^']*)'/);
  return match ? match[1] : null;
};

const extractNumericValue = (param: string): number | null => {
  const num = parseFloat(param?.replace(/[^\d.-]/g, '') || '');
  return isNaN(num) ? null : num;
};