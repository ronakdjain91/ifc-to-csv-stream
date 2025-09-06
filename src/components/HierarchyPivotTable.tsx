import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { IFCElement } from '@/utils/ifcParser3D';

interface HierarchyPivotTableProps {
  elements: IFCElement[];
  selectedElement?: IFCElement | null;
  onElementSelect: (element: IFCElement) => void;
}

export const HierarchyPivotTable = ({ elements, selectedElement, onElementSelect }: HierarchyPivotTableProps) => {
  const [expandedType, setExpandedType] = useState<Set<string>>(new Set());
  const [expandedLevel, setExpandedLevel] = useState<Set<string>>(new Set());

  const tree = useMemo(() => {
    const byType: Record<string, Record<string, IFCElement[]>> = {};
    for (const el of elements) {
      const t = el.type || 'Unknown';
      const lvl = el.level || 'Unknown';
      byType[t] ||= {};
      byType[t][lvl] ||= [];
      byType[t][lvl].push(el);
    }
    return byType;
  }, [elements]);

  const toggleType = (t: string) => {
    const s = new Set(expandedType);
    s.has(t) ? s.delete(t) : s.add(t);
    setExpandedType(s);
  };
  const toggleLevel = (key: string) => {
    const s = new Set(expandedLevel);
    s.has(key) ? s.delete(key) : s.add(key);
    setExpandedLevel(s);
  };

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Hierarchy: Type → Level → Elements</CardTitle>
      </CardHeader>
      <CardContent className="overflow-auto max-h-[600px] space-y-2">
        {Object.entries(tree).map(([type, levelMap]) => {
          const typeCount = Object.values(levelMap).reduce((acc, arr) => acc + arr.length, 0);
          const typeKey = `t:${type}`;
          const tOpen = expandedType.has(typeKey);
          return (
            <div key={type} className="border rounded-lg">
              <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50" onClick={() => toggleType(typeKey)}>
                <div className="flex items-center gap-2">
                  {tOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span className="font-medium">{type.replace('IFC', '')}</span>
                  <Badge variant="secondary">{typeCount}</Badge>
                </div>
              </div>

              {tOpen && (
                <div className="border-t bg-muted/25">
                  {Object.entries(levelMap).map(([level, els]) => {
                    const lvlKey = `${typeKey}|l:${level}`;
                    const lOpen = expandedLevel.has(lvlKey);
                    return (
                      <div key={lvlKey} className="p-3 border-b last:border-b-0">
                        <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => toggleLevel(lvlKey)}>
                          <div className="flex items-center gap-2">
                            {lOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <span className="text-sm font-medium">{level}</span>
                            <Badge variant="outline" className="text-xs">{els.length}</Badge>
                          </div>
                        </div>
                        {lOpen && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                            {els.map(el => (
                              <button
                                key={el.id}
                                onClick={() => onElementSelect(el)}
                                className={`text-left text-xs p-2 rounded transition-colors ${
                                  selectedElement?.id === el.id ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                {el.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default HierarchyPivotTable;
