import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs.jsx';
import { Search, List, History } from 'lucide-react';
import CatalogStats from './CatalogStats.jsx';
import ScanConfig from './ScanConfig.jsx';
import DuplicateGroupsList from './DuplicateGroupsList.jsx';
import MergeView from './MergeView.jsx';
import MergeHistoryList from './MergeHistoryList.jsx';
import { scanDuplicates, getDedupStats } from '@/lib/api.js';
import { toast } from 'sonner';

export default function DedupTab() {
  const [activeView, setActiveView] = useState('scan'); // scan | review | merge | history
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastScanId, setLastScanId] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await getDedupStats();
      setStats(res);
    } catch (err) {
      // Stats are optional, don't block the UI
    } finally {
      setStatsLoading(false);
    }
  };

  const handleScan = async (config) => {
    setScanning(true);
    try {
      const res = await scanDuplicates(config);
      const groupsFound = res.groupsFound || 0;
      setLastScanId(res.scanId);
      toast.success(`Escaneo completado: ${groupsFound} grupo(s) de duplicados encontrados`);
      if (groupsFound > 0) {
        setActiveView('review');
      }
      loadStats();
    } catch (err) {
      toast.error(err.message || 'Error al escanear duplicados');
    } finally {
      setScanning(false);
    }
  };

  const handleReviewGroup = (group) => {
    setSelectedGroup(group);
    setActiveView('merge');
  };

  const handleMergeComplete = () => {
    setSelectedGroup(null);
    setActiveView('review');
    loadStats();
  };

  const handleBackFromMerge = () => {
    setSelectedGroup(null);
    setActiveView('review');
  };

  // If we're in merge view, show MergeView directly
  if (activeView === 'merge' && selectedGroup) {
    return (
      <MergeView
        group={selectedGroup}
        onBack={handleBackFromMerge}
        onMergeComplete={handleMergeComplete}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <CatalogStats stats={stats} loading={statsLoading} />

      {/* Navigation tabs */}
      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList>
          <TabsTrigger value="scan" className="gap-2">
            <Search className="h-4 w-4" />
            Escanear
          </TabsTrigger>
          <TabsTrigger value="review" className="gap-2">
            <List className="h-4 w-4" />
            Revisar
            {stats?.pendingGroups > 0 && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs px-1.5 py-0.5">
                {stats.pendingGroups}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="mt-4">
          <ScanConfig onScan={handleScan} loading={scanning} />
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          <DuplicateGroupsList
            scanId={lastScanId}
            onReviewGroup={handleReviewGroup}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <MergeHistoryList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
