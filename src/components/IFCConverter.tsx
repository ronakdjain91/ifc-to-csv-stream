import { useState } from 'react';
import { FileUpload } from './FileUpload';
import { ProcessingProgress } from './ProcessingProgress';
import { parseIFCFile, convertToCSV } from '@/utils/ifcParser';
import { useToast } from '@/hooks/use-toast';

export const IFCConverter = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [csvData, setCsvData] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setIsComplete(false);
    setCsvData(null);

    try {
      // Parse the IFC file
      const entities = await parseIFCFile(file);
      
      if (entities.length === 0) {
        throw new Error('No valid IFC entities found in the file');
      }

      // Convert to CSV
      const csv = convertToCSV(entities);
      setCsvData(csv);
      setIsComplete(true);
      
      toast({
        title: 'Conversion successful!',
        description: `Converted ${entities.length} entities to CSV format`,
      });
    } catch (error) {
      toast({
        title: 'Conversion failed',
        description: error instanceof Error ? error.message : 'An error occurred during conversion',
        variant: 'destructive',
      });
      handleReset();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setIsProcessing(false);
    setIsComplete(false);
    setCsvData(null);
  };

  return (
    <div className="space-y-8">
      {!selectedFile ? (
        <FileUpload 
          onFileSelect={handleFileSelect} 
          isProcessing={isProcessing} 
        />
      ) : (
        <ProcessingProgress
          file={selectedFile}
          isProcessing={isProcessing}
          isComplete={isComplete}
          csvData={csvData}
          onReset={handleReset}
        />
      )}
    </div>
  );
};