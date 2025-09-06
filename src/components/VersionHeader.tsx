import { useMemo } from 'react';

export const VersionHeader = () => {
  const buildTimeLocal = useMemo(() => {
    try {
      return new Date(__BUILD_TIME__).toLocaleString();
    } catch {
      return __BUILD_TIME__;
    }
  }, []);

  return (
    <div className="w-full border-b bg-muted/30 text-xs text-muted-foreground">
      <div className="mx-auto max-w-full px-4 py-1.5 flex items-center justify-between">
        <span>
          Version: <span className="font-medium text-foreground">{__APP_VERSION__}</span>
        </span>
        <span className="hidden sm:inline">Built: {buildTimeLocal}</span>
      </div>
    </div>
  );
};

export default VersionHeader;
