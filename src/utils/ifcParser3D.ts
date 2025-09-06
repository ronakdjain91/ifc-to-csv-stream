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
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const model = parseIFCContent3D(content);
      
      // Simulate processing time
      setTimeout(() => {
        resolve(model);
      }, 2000);
    };
    
    reader.readAsText(file);
  });
};

const parseIFCContent3D = (content: string): IFCModel => {
  const elements: IFCElement[] = [];
  const levels: IFCLevel[] = [];
  const lines = content.split('\n');
  
  // Create sample levels
  const sampleLevels = [
    { id: 'L1', name: 'Ground Floor', elevation: 0 },
    { id: 'L2', name: 'First Floor', elevation: 3000 },
    { id: 'L3', name: 'Second Floor', elevation: 6000 },
  ];
  
  // Parse entities and create 3D elements
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('#')) {
      const element = parseIFCLine3D(line, i);
      if (element) {
        // Assign to random level for demo
        const level = sampleLevels[Math.floor(Math.random() * sampleLevels.length)];
        element.level = level.name;
        element.position = new THREE.Vector3(
          (Math.random() - 0.5) * 20,
          level.elevation / 1000,
          (Math.random() - 0.5) * 20
        );
        elements.push(element);
      }
    }
  }
  
  // Approximate volumes using axis-aligned bounding boxes and subtract openings (doors/windows)
  computeApproximateVolumes(elements);

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

const createGeometryForType = (type: string): THREE.BufferGeometry => {
  switch (type) {
    case 'IFCWALL':
      return new THREE.BoxGeometry(0.2, 3, 4);
    case 'IFCDOOR':
      return new THREE.BoxGeometry(0.1, 2.1, 0.8);
    case 'IFCWINDOW':
      return new THREE.BoxGeometry(0.05, 1.5, 1.2);
    case 'IFCSPACE':
      return new THREE.BoxGeometry(4, 0.1, 4);
    case 'IFCCOLUMN':
      return new THREE.CylinderGeometry(0.2, 0.2, 3);
    case 'IFCBEAM':
      return new THREE.BoxGeometry(4, 0.3, 0.3);
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
};

const createMaterialForType = (type: string): THREE.Material => {
  const materials: Record<string, number> = {
    IFCWALL: 0x8B4513,
    IFCDOOR: 0x654321,
    IFCWINDOW: 0x87CEEB,
    IFCSPACE: 0x90EE90,
    IFCCOLUMN: 0x808080,
    IFCBEAM: 0x8B4513,
    default: 0x888888
  };
  
  return new THREE.MeshPhongMaterial({
    color: materials[type] || materials.default,
    transparent: type === 'IFCWINDOW',
    opacity: type === 'IFCWINDOW' ? 0.6 : 1
  });
};

const extractStringValue = (param: string): string | null => {
  const match = param?.match(/'([^']*)'/);
  return match ? match[1] : null;
};

const extractNumericValue = (param: string): number | null => {
  const num = parseFloat(param?.replace(/[^\d.-]/g, '') || '');
  return isNaN(num) ? null : num;
};

// Computes approximate volumes using geometry bounding boxes and subtracts window/door openings
const computeApproximateVolumes = (elements: IFCElement[]) => {
  // First compute raw volumes from geometry bounds
  const idToVolume: Record<string, number> = {};
  for (const el of elements) {
    let volume = 0;
    if (el.geometry) {
      const bbox = new THREE.Box3().setFromBufferAttribute((el.geometry as any).attributes?.position);
      const size = new THREE.Vector3();
      bbox.getSize(size);
      volume = Math.abs(size.x * size.y * size.z);
    } else {
      // fallback rough volume based on props if any
      const w = Number(el.properties?.width || 1);
      const h = Number(el.properties?.height || 1);
      const t = Number(el.properties?.thickness || 0.2);
      volume = w * h * t;
    }
    el.properties.volume = volume;
    idToVolume[el.id] = volume;
  }

  // Subtract openings volume from host elements where applicable (simple heuristic)
  const openingTypes = new Set(['IFCOPENINGELEMENT', 'IFCWINDOW', 'IFCDOOR']);
  const hostTypes = new Set(['IFCWALL', 'IFCSLAB']);

  const openings = elements.filter(e => openingTypes.has(e.type));
  const hosts = elements.filter(e => hostTypes.has(e.type));
  if (openings.length && hosts.length) {
    const averageOpening = openings.reduce((s, o) => s + (o.properties.volume || 0), 0) / openings.length;
    for (const host of hosts) {
      const subtract = averageOpening * Math.min(5, Math.ceil(openings.length / hosts.length));
      host.properties.volume = Math.max(0, (host.properties.volume || 0) - subtract);
    }
  }
};