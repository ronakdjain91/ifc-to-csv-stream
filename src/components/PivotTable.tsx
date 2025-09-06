import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { IFCElement } from '../utils/ifcParser3D';
// lazy import to avoid bundler resolution issues in some environments

interface PivotTableProps {
  elements: IFCElement[];
  selectedElement?: IFCElement | null;
  onElementSelect: (element: IFCElement) => void;
  onDownloadSelectedParams?: () => void;
}

interface PivotData {
  [key: string]: {
    elements: IFCElement[];
    count: number;
    totalArea?: number;
    totalVolume?: number;
    children?: PivotData;
  };
}

const availableFields = [
  { value: 'type', label: 'Element Type' },
  { value: 'level', label: 'Level' },
  { value: 'material', label: 'Material' },
  { value: 'name', label: 'Name' },
];

export const PivotTable = ({ elements, selectedElement, onElementSelect, onDownloadSelectedParams }: PivotTableProps) => {
  const [rowField, setRowField] = useState('type');
  const [columnField, setColumnField] = useState('level');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const pivotData = useMemo(() => {
    const data: PivotData = {};
    
    elements.forEach(element => {
      const rowKey = (element as any)[rowField] as string || 'Unknown';
      const colKey = (element as any)[columnField] as string || 'Unknown';
      
      if (!data[rowKey]) {
        data[rowKey] = {
          elements: [],
          count: 0,
          totalArea: 0,
          totalVolume: 0,
          children: {}
        };
      }
      
      if (!data[rowKey].children![colKey]) {
        data[rowKey].children![colKey] = {
          elements: [],
          count: 0,
          totalArea: 0,
          totalVolume: 0
        } as any;
      }
      
      data[rowKey].elements.push(element);
      data[rowKey].count++;
      data[rowKey].totalArea = (data[rowKey].totalArea || 0) + (element.properties?.area || 0);
      data[rowKey].totalVolume = (data[rowKey].totalVolume || 0) + (element.properties?.volume || 0);
      
      const child = data[rowKey].children![colKey]!;
      child.elements.push(element);
      child.count++;
      child.totalArea = (child.totalArea || 0) + (element.properties?.area || 0);
      child.totalVolume = (child.totalVolume || 0) + (element.properties?.volume || 0);
    });
    
    return data;
  }, [elements, rowField, columnField]);

  // Excel export removed per request

  const toggleRowExpansion = (rowKey: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowKey)) {
      newExpanded.delete(rowKey);
    } else {
      newExpanded.add(rowKey);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">Pivot Table Analysis</CardTitle>
          {onDownloadSelectedParams && (
            <Button size="sm" variant="outline" onClick={onDownloadSelectedParams}>
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
          )}
        </div>
        
        <div className="flex gap-4 mt-4">
          <div className="flex-1 min-w-0">
            <label className="text-sm font-medium text-muted-foreground">Rows</label>
            <Select value={rowField} onValueChange={setRowField as any}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map(field => (
                  <SelectItem key={field.value} value={field.value}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1 min-w-0">
            <label className="text-sm font-medium text-muted-foreground">Columns</label>
            <Select value={columnField} onValueChange={setColumnField as any}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map(field => (
                  <SelectItem key={field.value} value={field.value}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="overflow-auto max-h-[600px]">
        <div className="space-y-2">
          {Object.entries(pivotData).map(([rowKey, rowData]) => (
            <div key={rowKey} className="border rounded-lg">
              <div 
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                onClick={() => toggleRowExpansion(rowKey)}
              >
                <div className="flex items-center gap-2">
                  {expandedRows.has(rowKey) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <span className="font-medium truncate max-w-[50vw]">{rowKey}</span>
                  <Badge variant="secondary">{rowData.count}</Badge>
                </div>
                
                <div className="flex gap-4 text-xs text-muted-foreground">
                  {rowData.totalArea! > 0 && (
                    <span>Area: {rowData.totalArea!.toFixed(1)} m²</span>
                  )}
                  {rowData.totalVolume! > 0 && (
                    <span>Vol: {rowData.totalVolume!.toFixed(1)} m³</span>
                  )}
                </div>
              </div>
              
              {expandedRows.has(rowKey) && (
                <div className="border-t bg-muted/25">
                  {Object.entries(rowData.children!).map(([colKey, colData]) => (
                    <div key={colKey} className="p-3 border-b last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate max-w-[40vw]">{colKey}</span>
                          <Badge variant="outline" className="text-xs">
                            {colData.count}
                          </Badge>
                        </div>
                        
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          {colData.totalArea! > 0 && (
                            <span>{colData.totalArea!.toFixed(1)} m²</span>
                          )}
                          {colData.totalVolume! > 0 && (
                            <span>{colData.totalVolume!.toFixed(1)} m³</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                        {colData.elements.slice(0, 6).map(element => (
                          <button
                            key={element.id}
                            onClick={() => onElementSelect(element)}
                            className={`text-left text-xs p-2 rounded transition-colors ${
                              selectedElement?.id === element.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <span className="block truncate">{element.name}</span>
                          </button>
                        ))}
                        {colData.elements.length > 6 && (
                          <div className="text-xs text-muted-foreground p-2">
                            +{colData.elements.length - 6} more
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PivotTable;
