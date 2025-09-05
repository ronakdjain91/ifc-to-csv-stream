import { useState, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Upload, RotateCcw } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { FileUpload } from './FileUpload';
import { ModelViewer } from './ModelViewer';
import { QuantityPanel } from './QuantityPanel';
import { ProcessingProgress } from './ProcessingProgress';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable';
import { parseIFCFile3D, IFCModel, IFCElement } from '../utils/ifcParser3D';

export const IFCViewer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [model, setModel] = useState<IFCModel | null>(null);
  const [selectedElement, setSelectedElement] = useState<IFCElement | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set());
  const { toast } = useToast();

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
              <ModelViewer
                elements={visibleElements}
                selectedElement={selectedElement}
                onElementClick={handleElementSelect}
              />
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
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
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};