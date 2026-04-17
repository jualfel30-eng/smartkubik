import { useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import haptics from '@/lib/haptics';
import MobileStorefrontConfig from './MobileStorefrontConfig.jsx';

export default function MobileStorefrontPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    haptics.tap();
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">Mi Sitio Web</h1>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-full text-muted-foreground active:bg-muted/50 no-tap-highlight"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto mobile-scroll">
        <MobileStorefrontConfig key={refreshKey} />
      </div>
    </div>
  );
}
