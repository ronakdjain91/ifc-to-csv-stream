// Simple IFC parser for demonstration
// In a real implementation, you'd use a proper IFC parsing library

export interface IFCEntity {
  id: string;
  type: string;
  properties: Record<string, any>;
  params?: string[];
}

export const parseIFCFile = async (file: File): Promise<IFCEntity[]> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const entities = parseIFCContent(content);
      
      // Simulate processing time
      setTimeout(() => {
        resolve(entities);
      }, 3000);
    };
    
    reader.readAsText(file);
  });
};

const parseIFCContent = (content: string): IFCEntity[] => {
  const entities: IFCEntity[] = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (line.trim().startsWith('#')) {
      const entity = parseIFCLine(line);
      if (entity) {
        entities.push(entity);
      }
    }
  }
  
  return entities;
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
      properties,
      params: paramList,
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
  const csvLines = [headers.join(',')];
  
  entities.forEach(entity => {
    const row = [
      entity.id,
      entity.type,
      ...Array.from(allProperties).map(prop => {
        const value = entity.properties[prop];
        return value !== undefined ? `"${value}"` : '';
      })
    ];
    csvLines.push(row.join(','));
  });
  
  return csvLines.join('\n');
};

export const convertToCSVAllParams = (entities: IFCEntity[]): string => {
  if (entities.length === 0) return '';
  const maxParams = entities.reduce((m, e) => Math.max(m, e.params?.length || 0), 0);
  const headers = ['ID', 'Type', ...Array.from({ length: maxParams }, (_, i) => `Param_${i + 1}`)];
  const csvLines = [headers.join(',')];
  entities.forEach(entity => {
    const params = entity.params || [];
    const padded = [...params];
    while (padded.length < maxParams) padded.push('');
    const row = [entity.id, entity.type, ...padded.map(v => (v !== undefined ? `"${String(v).replace(/\"/g, '""')}"` : ''))];
    csvLines.push(row.join(','));
  });
  return csvLines.join('\n');
};