import { useState, useEffect } from 'react';
import { CheckCircle, Download, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface ProcessingProgressProps {
  file: File | null;
  isProcessing: boolean;
  isComplete: boolean;
  csvData: string | null;
  onReset: () => void;
}

const steps = [
  { label: 'Reading IFC file', icon: FileText },
  { label: 'Parsing structure', icon: Loader2 },
  { label: 'Converting to CSV', icon: Loader2 },
  { label: 'Ready for download', icon: CheckCircle }
];

export const ProcessingProgress = ({ 
  file, 
  isProcessing, 
  isComplete, 
  csvData, 
  onReset 
}: ProcessingProgressProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isProcessing) return;

    const stepDuration = 1000; // 1 second per step
    const totalSteps = steps.length - 1; // Exclude the final "complete" step
    
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / (totalSteps * 10));
        
        // Update current step based on progress
        const newStep = Math.floor((newProgress / 100) * totalSteps);
        setCurrentStep(Math.min(newStep, totalSteps - 1));
        
        if (newProgress >= 100) {
          clearInterval(interval);
          return 100;
        }
        
        return newProgress;
      });
    }, stepDuration / 10);

    return () => clearInterval(interval);
  }, [isProcessing]);

  useEffect(() => {
    if (isComplete) {
      setCurrentStep(steps.length - 1);
      setProgress(100);
    }
  }, [isComplete]);

  const downloadCSV = () => {
    if (!csvData || !file) return;
    
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name.replace('.ifc', '')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    if (!csvData || !file) return;
    const ws = XLSX.utils.csv_to_sheet(csvData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'IFC Data');
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const safeBase = baseName.replace(/[^a-zA-Z0-9._-]+/g, '_') || 'export';
    XLSX.writeFile(wb, `${safeBase}.xlsx`);
  };

  if (!file) return null;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="p-8">
        <div className="space-y-6">
          {/* File Info */}
          <div className="flex items-center space-x-4 p-4 bg-accent/30 rounded-lg">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-semibold">{file.name}</h3>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="space-y-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep && isProcessing;
              const isCompleted = index < currentStep || isComplete;
              
              return (
                <div key={index} className="flex items-center space-x-4">
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300",
                    isCompleted 
                      ? "bg-success text-success-foreground" 
                      : isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-muted-foreground"
                  )}>
                    {isCompleted && index < steps.length - 1 ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Icon className={cn(
                        "h-4 w-4",
                        isActive && "animate-spin"
                      )} />
                    )}
                  </div>
                  <span className={cn(
                    "font-medium transition-colors duration-300",
                    isCompleted 
                      ? "text-success" 
                      : isActive 
                        ? "text-primary" 
                        : "text-muted-foreground"
                  )}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          {(isProcessing || isComplete) && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                {Math.round(progress)}% complete
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            {isComplete && csvData && (
              <>
                <Button onClick={downloadCSV} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
                <Button onClick={downloadExcel} variant="secondary" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download Excel
                </Button>
              </>
            )}
            <Button variant="outline" onClick={onReset} className="flex-1">
              Convert Another File
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};