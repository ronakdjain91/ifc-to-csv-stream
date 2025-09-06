// Simple IFC parser for demonstration
// In a real implementation, you'd use a proper IFC parsing library

export interface IFCEntity {
  id: string;
  type: string;
  properties: Record<string, any>;
}

export const parseIFCFile = async (file: File): Promise<IFCEntity[]> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      const entities = parseIFCContent(content);
      resolve(entities);
    };

    reader.readAsText(file);
  });
};

const parseIFCContent = (content: string): IFCEntity[] => {
  const entities: IFCEntity[] = [];
  const records = splitIFCEntities(content);

  for (const record of records) {
    const trimmed = record.trim();
    if (!trimmed.startsWith('#')) continue;
    const entity = parseIFCLine(trimmed);
    if (entity) entities.push(entity);
  }

  return entities;
};

// Splits IFC STEP content into entity records that may span multiple lines
const splitIFCEntities = (content: string): string[] => {
  const result: string[] = [];
  let buf = '';
  let parenDepth = 0;
  let inString = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    // handle string literals with doubled single-quotes inside
    if (ch === "'" && (!inString || next !== "'")) {
      inString = !inString;
      buf += ch;
      continue;
    }
    if (inString && ch === "'" && next === "'") {
      buf += "''";
      i++; // skip next
      continue;
    }

    if (!inString) {
      if (ch === '(') parenDepth++;
      if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
    }

    buf += ch;

    if (!inString && ch === ';' && parenDepth === 0) {
      const record = buf.trim();
      if (record) result.push(record);
      buf = '';
    }
  }

  if (buf.trim()) result.push(buf.trim());
  return result;
};

const parseIFCLine = (line: string): IFCEntity | null => {
  try {
    // Basic IFC line parsing - this is simplified
    const match = line.match(/#(\d+)\s*=\s*(\w+)\s*\((.*)\);?/);
    if (!match) return null;
    
    const [, id, type, params] = match;
    
    // Parse parameters (simplified)
    const properties: Record<string, any> = {};
    const paramList = params.split(',').map(p => p.trim());
    
    // Add some basic properties based on common IFC entities
    switch (type) {
      case 'IFCWALL':
        properties.name = extractStringValue(paramList[0]) || `Wall_${id}`;
        properties.height = extractNumericValue(paramList[1]) || 3000;
        properties.thickness = extractNumericValue(paramList[2]) || 200;
        break;
      case 'IFCDOOR':
        properties.name = extractStringValue(paramList[0]) || `Door_${id}`;
        properties.width = extractNumericValue(paramList[1]) || 800;
        properties.height = extractNumericValue(paramList[2]) || 2100;
        break;
      case 'IFCWINDOW':
        properties.name = extractStringValue(paramList[0]) || `Window_${id}`;
        properties.width = extractNumericValue(paramList[1]) || 1200;
        properties.height = extractNumericValue(paramList[2]) || 1500;
        break;
      case 'IFCSPACE':
        properties.name = extractStringValue(paramList[0]) || `Space_${id}`;
        properties.area = extractNumericValue(paramList[1]) || 25;
        properties.volume = extractNumericValue(paramList[2]) || 75;
        break;
      default:
        properties.name = extractStringValue(paramList[0]) || `${type}_${id}`;
        break;
    }
    
    return {
      id,
      type,
      properties
    };
  } catch (error) {
    return null;
  }
};

const extractStringValue = (param: string): string | null => {
  const match = param?.match(/'([^']*)'/);
  return match ? match[1] : null;
};

const extractNumericValue = (param: string): number | null => {
  const num = parseFloat(param?.replace(/[^\d.-]/g, '') || '');
  return isNaN(num) ? null : num;
};

export const convertToCSV = (entities: IFCEntity[]): string => {
  if (entities.length === 0) return '';
  
  // Get all unique property keys
  const allProperties = new Set<string>();
  entities.forEach(entity => {
    Object.keys(entity.properties).forEach(key => allProperties.add(key));
  });
  
  const headers = ['ID', 'Type', ...Array.from(allProperties)];
  const csvLines = [headers.map(csvEscape).join(',')];
  
  entities.forEach(entity => {
    const row = [
      csvEscape(entity.id),
      csvEscape(entity.type),
      ...Array.from(allProperties).map(prop => {
        const value = entity.properties[prop];
        return value !== undefined ? csvEscape(value) : '';
      })
    ];
    csvLines.push(row.join(','));
  });
  
  return csvLines.join('\n');
};

const csvEscape = (value: unknown): string => {
  let str: string;
  if (value === null || value === undefined) str = '';
  else if (typeof value === 'object') str = JSON.stringify(value);
  else str = String(value);
  // escape quotes
  str = str.replace(/"/g, '""');
  return `"${str}"`;
};