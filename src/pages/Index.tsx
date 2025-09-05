import { IFCConverter } from '@/components/IFCConverter';
import { FileText, ArrowRight, Download } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">IFC to CSV Converter</h1>
              <p className="text-sm text-muted-foreground">Convert Building Information Models to spreadsheet format</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Transform IFC Files to CSV
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Upload your Industry Foundation Classes (IFC) files and convert them to CSV format for easy analysis in spreadsheets and databases.
            </p>
            
            {/* Process Steps */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-card border">
                <div className="p-3 bg-primary/10 rounded-full">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Upload IFC File</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Select your .ifc file from any BIM software
                </p>
              </div>
              
              <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-card border">
                <div className="p-3 bg-primary/10 rounded-full">
                  <ArrowRight className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Auto Processing</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Our parser extracts entities and properties
                </p>
              </div>
              
              <div className="flex flex-col items-center space-y-3 p-6 rounded-lg bg-card border">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Download className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Download CSV</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Get your structured data in CSV format
                </p>
              </div>
            </div>
          </div>

          {/* Converter Component */}
          <IFCConverter />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>Professional IFC file processing in your browser. No data is stored on our servers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
