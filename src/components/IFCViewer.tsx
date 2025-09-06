import { useState, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Upload, RotateCcw } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { FileUpload } from './FileUpload';
import { ModelViewer } from './ModelViewer';
import { QuantityPanel } from './QuantityPanel';
import { PivotTable } from './PivotTable';
import { HierarchyPivotTable } from './HierarchyPivotTable';
import { ProcessingProgress } from './ProcessingProgress';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useIsMobile } from '../hooks/use-mobile';
import { parseIFCFile3D, IFCModel, IFCElement } from '../utils/ifcParser3D';
import { parseIFCFile as parseIFCAll, convertToCSVSelectedParams } from '@/utils/ifcParser';

export const IFCViewer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [model, setModel] = useState<IFCModel | null>(null);
  const [selectedElement, setSelectedElement] = useState<IFCElement | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set());
  const [is3DLoaded, setIs3DLoaded] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);
    setIsComplete(false);
    setSelectedElement(null);

    try {
      const parsedModel = await parseIFCFile3D(selectedFile);
      
      // Initialize all types as visible
      const allTypes = new Set(Object.keys(parsedModel.quantities.byType));
      setVisibleTypes(allTypes);
      
      setModel(parsedModel);
      setIsComplete(true);
      toast({
        title: "Success!",
        description: `IFC file processed successfully. Found ${parsedModel.elements.length} elements across ${parsedModel.levels.length} levels.`,
      });
    } catch (error) {
      console.error('Error processing IFC file:', error);
      toast({
        title: "Error",
        description: "Failed to process the IFC file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const handleReset = useCallback(() => {
    setFile(null);
    setIsProcessing(false);
    setIsComplete(false);
    setModel(null);
    setSelectedElement(null);
    setVisibleTypes(new Set());
    setIs3DLoaded(false);
  }, []);

  const handleElementSelect = useCallback((element: IFCElement) => {
    setSelectedElement(element);
  }, []);

  const handleTypeVisibilityToggle = useCallback((type: string) => {
    setVisibleTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  }, []);

  const visibleElements = model?.elements.filter(element => 
    visibleTypes.has(element.type)
  ) || [];

  const handleDownloadAllParamsCSV = useCallback(async () => {
    if (!file) return;
    const entities = await parseIFCAll(file);
    const structuralTypes = new Set([
      'IFCBEAM',
      'IFCCOLUMN',
      'IFCSLAB',
      'IFCMEMBER',
      'IFCBRACE',
      'IFCTRUSS',
      'IFCFOOTING',
      'IFCPILE',
      'IFCWALL',
      'IFCPLATE'
    ]);
    const filtered = entities.filter(e => structuralTypes.has(e.type?.toUpperCase?.() || e.type));
    const csv = convertToCSVSelectedParams(filtered);
    const bom = '\uFEFF';
    const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const safeBase = baseName.replace(/[^a-zA-Z0-9._-]+/g, '_') || 'export';
    a.download = `${safeBase}_structural_selected_params.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [file]);

  if (!file) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <div className="p-8">
          <div className="text-center mb-6">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Upload IFC File
            </h3>
            <p className="text-sm text-muted-foreground">
              Select an IFC file to view the 3D model and analyze quantities
            </p>
          </div>
          <FileUpload onFileSelect={handleFileSelect} isProcessing={false} />
        </div>
      </Card>
    );
  }

  if (isProcessing || !isComplete) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">
              Processing IFC File
            </h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReset}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
          <ProcessingProgress 
            file={file}
            isProcessing={isProcessing}
            isComplete={isComplete}
            csvData={null}
            onReset={handleReset}
          />
        </div>
      </Card>
    );
  }

  if (isMobile) {
    return (
      <div className="h-screen flex flex-col">
        <div className="border-b bg-background px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-foreground">IFC Viewer</h1>
              <p className="text-xs text-muted-foreground">
                {file.name} • {model?.elements.length} elements
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <Upload className="w-3 h-3 mr-1" />
              New
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="model" className="h-full flex flex-col">
            <div className="border-b px-4">
              <div className="flex items-center justify-between py-2 gap-2">
                <TabsList className="grid grid-cols-4">
                  <TabsTrigger value="model" className="text-xs">3D Model</TabsTrigger>
                  <TabsTrigger value="quantities" className="text-xs">Quantities</TabsTrigger>
                  <TabsTrigger value="pivot" className="text-xs">Pivot</TabsTrigger>
                  <TabsTrigger value="hierarchy" className="text-xs">Hierarchy</TabsTrigger>
                </TabsList>
                <Button size="sm" variant="outline" onClick={handleDownloadAllParamsCSV}>
                  Download CSV (All Params)
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <TabsContent value="model" className="h-full m-0 p-2">
                {!is3DLoaded ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <Button onClick={() => setIs3DLoaded(true)}>
                      Load 3D Model
                    </Button>
                  </div>
                ) : (
                  <ModelViewer
                    elements={visibleElements}
                    selectedElement={selectedElement}
                    onElementClick={handleElementSelect}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="quantities" className="h-full m-0">
                {model && (
                  <QuantityPanel
                    quantitiesByType={model.quantities.byType}
                    quantitiesByLevel={model.quantities.byLevel}
                    selectedElement={selectedElement}
                    onElementSelect={handleElementSelect}
                    visibleTypes={visibleTypes}
                    onTypeVisibilityToggle={handleTypeVisibilityToggle}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="pivot" className="h-full m-0 p-2">
                {model && (
                  <PivotTable
                    elements={model.elements}
                    selectedElement={selectedElement}
                    onElementSelect={handleElementSelect}
                    onDownloadSelectedParams={handleDownloadAllParamsCSV}
                  />
                )}
              </TabsContent>
              <TabsContent value="hierarchy" className="h-full m-0 p-2">
                {model && (
                  <HierarchyPivotTable
                    elements={model.elements}
                    selectedElement={selectedElement}
                    onElementSelect={handleElementSelect}
                  />
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    );
  }
  return (
    <div className="h-screen flex flex-col">
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">IFC Viewer</h1>
            <p className="text-sm text-muted-foreground">
              {file.name} • {model?.elements.length} elements • {model?.levels.length} levels
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <Upload className="w-4 h-4 mr-2" />
            New File
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={70} minSize={50}>
            <div className="h-full p-4">
              {!is3DLoaded ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Button onClick={() => setIs3DLoaded(true)}>
                    Load 3D Model
                  </Button>
                </div>
              ) : (
                <ModelViewer
                  elements={visibleElements}
                  selectedElement={selectedElement}
                  onElementClick={handleElementSelect}
                />
              )}
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={40} minSize={30} maxSize={60}>
            <Tabs defaultValue="quantities" className="h-full flex flex-col">
              <div className="border-b px-4">
                <div className="flex items-center justify-between py-2 gap-2">
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="quantities" className="text-sm">Quantities</TabsTrigger>
                    <TabsTrigger value="pivot" className="text-sm">Pivot</TabsTrigger>
                    <TabsTrigger value="hierarchy" className="text-sm">Hierarchy</TabsTrigger>
                  </TabsList>
                  <Button size="sm" variant="outline" onClick={handleDownloadAllParamsCSV}>
                    Download CSV (All Params)
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <TabsContent value="quantities" className="h-full m-0">
                  {model && (
                    <QuantityPanel
                      quantitiesByType={model.quantities.byType}
                      quantitiesByLevel={model.quantities.byLevel}
                      selectedElement={selectedElement}
                      onElementSelect={handleElementSelect}
                      visibleTypes={visibleTypes}
                      onTypeVisibilityToggle={handleTypeVisibilityToggle}
                    />
                  )}
                </TabsContent>
                
                <TabsContent value="pivot" className="h-full m-0 p-4">
                  {model && (
                    <PivotTable
                      elements={model.elements}
                      selectedElement={selectedElement}
                      onElementSelect={handleElementSelect}
                      onDownloadSelectedParams={handleDownloadAllParamsCSV}
                    />
                  )}
                </TabsContent>
                <TabsContent value="hierarchy" className="h-full m-0 p-4">
                  {model && (
                    <HierarchyPivotTable
                      elements={model.elements}
                      selectedElement={selectedElement}
                      onElementSelect={handleElementSelect}
                    />
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};