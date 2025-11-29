import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MarketingCampaigns from '../components/marketing/MarketingCampaigns';
import ProductCampaignsPage from './ProductCampaignsPage';
import LoyaltyManager from '../components/marketing/LoyaltyManager';
import CouponManager from '../components/marketing/CouponManager';
import PromotionsManager from '../components/marketing/PromotionsManager';
import { Mail, Package, Award, Tag, Percent } from 'lucide-react';

const MarketingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'campaigns';

  // Mapear tabs de campañas con prefijo a nivel principal y sub-tab
  const getTabConfig = (param) => {
    if (param.startsWith('campaigns-')) {
      const subTab = param.replace('campaigns-', '');
      return { mainTab: 'campaigns', subTab };
    }
    return { mainTab: param, subTab: 'overview' };
  };

  const { mainTab, subTab } = getTabConfig(tabParam);
  const [activeTab, setActiveTab] = useState(mainTab);
  const [campaignsSubTab, setCampaignsSubTab] = useState(subTab);

  // Sincronizar con URL params
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      const config = getTabConfig(tabFromUrl);
      if (config.mainTab !== activeTab) {
        setActiveTab(config.mainTab);
      }
      if (config.mainTab === 'campaigns' && config.subTab !== campaignsSubTab) {
        setCampaignsSubTab(config.subTab);
      }
    }
  }, [searchParams, activeTab, campaignsSubTab]);

  // Actualizar URL cuando cambia el tab principal
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    if (newTab === 'campaigns') {
      setSearchParams({ tab: `campaigns-${campaignsSubTab}` }, { replace: true });
    } else {
      setSearchParams({ tab: newTab }, { replace: true });
    }
  };

  // Actualizar URL cuando cambia el sub-tab de campañas
  const handleCampaignsSubTabChange = (newSubTab) => {
    setCampaignsSubTab(newSubTab);
    setSearchParams({ tab: `campaigns-${newSubTab}` }, { replace: true });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Marketing</h1>
        <p className="text-muted-foreground">Gestiona campañas, promociones, cupones y programas de lealtad</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full max-w-4xl grid-cols-5 mb-6">
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Campañas
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Productos
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Lealtad
          </TabsTrigger>
          <TabsTrigger value="coupons" className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Cupones
          </TabsTrigger>
          <TabsTrigger value="promotions" className="flex items-center gap-2">
            <Percent className="w-4 h-4" />
            Promociones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <MarketingCampaigns
            initialSubTab={campaignsSubTab}
            onSubTabChange={handleCampaignsSubTabChange}
          />
        </TabsContent>

        <TabsContent value="products">
          <ProductCampaignsPage />
        </TabsContent>

        <TabsContent value="loyalty">
          <LoyaltyManager />
        </TabsContent>

        <TabsContent value="coupons">
          <CouponManager />
        </TabsContent>

        <TabsContent value="promotions">
          <PromotionsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketingPage;
