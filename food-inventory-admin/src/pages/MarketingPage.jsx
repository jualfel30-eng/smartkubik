import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MarketingCampaigns from '../components/marketing/MarketingCampaigns';
import ProductCampaignsPage from './ProductCampaignsPage';
import { Mail, Package } from 'lucide-react';

const MarketingPage = () => {
  const [activeTab, setActiveTab] = useState('campaigns');

  return (
    <div className="container mx-auto p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Campañas Regulares
          </TabsTrigger>
          <TabsTrigger value="product-campaigns" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Campañas de Producto
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <MarketingCampaigns />
        </TabsContent>

        <TabsContent value="product-campaigns">
          <ProductCampaignsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketingPage;
