import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export const FileUpload = ({ onFileSelect, isProcessing }: FileUploadProps) => {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);
    
    if (rejectedFiles.length > 0) {
      setError('Please select a valid IFC file (.ifc extension)');
      return;
    }
    
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        setError('File size must be less than 100MB');
        return;
      }
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/x-step': ['.ifc'],
      'text/plain': ['.ifc']
    },
    multiple: false,
    disabled: isProcessing
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="p-8">
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-300",
            isDragActive 
              ? "border-primary bg-accent/50 scale-[1.02]" 
              : "border-border hover:border-primary/50 hover:bg-accent/20",
            isProcessing && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center space-y-4">
            <div className={cn(
              "p-4 rounded-full transition-all duration-300",
              isDragActive ? "bg-primary text-primary-foreground scale-110" : "bg-accent text-accent-foreground"
            )}>
              {isDragActive ? (
                <Upload className="h-8 w-8" />
              ) : (
                <File className="h-8 w-8" />
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                {isDragActive ? 'Drop your IFC file here' : 'Upload IFC File'}
              </h3>
              <p className="text-muted-foreground">
                Drag and drop your IFC file here, or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                Supports .ifc files up to 100MB
              </p>
            </div>
            
            {!isDragActive && !isProcessing && (
              <Button variant="outline" className="mt-4">
                Choose File
              </Button>
            )}
          </div>
        </div>
      </Card>
      
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};