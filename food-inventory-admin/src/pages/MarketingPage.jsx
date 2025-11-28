import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MarketingCampaigns from '../components/marketing/MarketingCampaigns';
import ProductCampaignsPage from './ProductCampaignsPage';
import LoyaltyManager from '../components/marketing/LoyaltyManager';
import CouponManager from '../components/marketing/CouponManager';
import PromotionsManager from '../components/marketing/PromotionsManager';
import { Mail, Package, Award, Tag, Percent } from 'lucide-react';

const MarketingPage = () => {
  const [activeTab, setActiveTab] = useState('campaigns');

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Marketing</h1>
        <p className="text-muted-foreground">Gestiona campañas, promociones, cupones y programas de lealtad</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-4xl grid-cols-5 mb-6">
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Campañas
          </TabsTrigger>
          <TabsTrigger value="product-campaigns" className="flex items-center gap-2">
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
          <MarketingCampaigns />
        </TabsContent>

        <TabsContent value="product-campaigns">
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
