import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Building2, Layers, Eye, EyeOff } from 'lucide-react';
import { IFCQuantity, IFCElement } from '../utils/ifcParser3D';

interface QuantityPanelProps {
  quantitiesByType: Record<string, IFCQuantity>;
  quantitiesByLevel: Record<string, IFCQuantity>;
  selectedElement?: IFCElement | null;
  onElementSelect: (element: IFCElement) => void;
  visibleTypes: Set<string>;
  onTypeVisibilityToggle: (type: string) => void;
}

interface QuantityItemProps {
  quantity: IFCQuantity;
  selectedElement?: IFCElement | null;
  onElementSelect: (element: IFCElement) => void;
  isVisible: boolean;
  onVisibilityToggle: () => void;
}

const QuantityItem = ({ 
  quantity, 
  selectedElement, 
  onElementSelect, 
  isVisible, 
  onVisibilityToggle 
}: QuantityItemProps) => {
  return (
    <Card className="mb-3">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-foreground">
            {quantity.type.replace('IFC', '')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {quantity.count}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onVisibilityToggle}
              className="h-6 w-6 p-0"
            >
              {isVisible ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
          {quantity.totalArea && (
            <div>Area: {quantity.totalArea.toFixed(1)} m²</div>
          )}
          {quantity.totalVolume && (
            <div>Volume: {quantity.totalVolume.toFixed(1)} m³</div>
          )}
        </div>
        <div className="space-y-1">
          {quantity.elements.slice(0, 3).map((element) => (
            <button
              key={element.id}
              onClick={() => onElementSelect(element)}
              className={`w-full text-left text-xs p-2 rounded transition-colors ${
                selectedElement?.id === element.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {element.name}
            </button>
          ))}
          {quantity.elements.length > 3 && (
            <div className="text-xs text-muted-foreground text-center py-1">
              +{quantity.elements.length - 3} more items
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const QuantityPanel = ({
  quantitiesByType,
  quantitiesByLevel,
  selectedElement,
  onElementSelect,
  visibleTypes,
  onTypeVisibilityToggle
}: QuantityPanelProps) => {
  return (
    <div className="w-full h-full bg-background border-l">
      <Tabs defaultValue="type" className="h-full flex flex-col">
        <div className="p-4 border-b">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="type" className="text-xs">
              <Building2 className="w-3 h-3 mr-1" />
              By Type
            </TabsTrigger>
            <TabsTrigger value="level" className="text-xs">
              <Layers className="w-3 h-3 mr-1" />
              By Level
            </TabsTrigger>
          </TabsList>
        </div>
        
        <div className="flex-1 overflow-auto">
          <TabsContent value="type" className="p-4 mt-0">
            <div className="space-y-2">
              {Object.entries(quantitiesByType).map(([type, quantity]) => (
                <QuantityItem
                  key={type}
                  quantity={quantity}
                  selectedElement={selectedElement}
                  onElementSelect={onElementSelect}
                  isVisible={visibleTypes.has(type)}
                  onVisibilityToggle={() => onTypeVisibilityToggle(type)}
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="level" className="p-4 mt-0">
            <div className="space-y-2">
              {Object.entries(quantitiesByLevel).map(([level, quantity]) => (
                <QuantityItem
                  key={level}
                  quantity={quantity}
                  selectedElement={selectedElement}
                  onElementSelect={onElementSelect}
                  isVisible={true}
                  onVisibilityToggle={() => {}}
                />
              ))}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};