import { useEffect, useState } from 'react';
import { useStorefrontConfig, StorefrontConfig } from './useStorefrontConfig';
import { fetchApi } from '../../../lib/api';
import { useAuth } from '../../../hooks/use-auth';

// ─── Restaurant config shape ─────────────────────────────────────────────────
export interface RestaurantConfig {
  enabled: boolean;
  restaurantName: string;
  tagline: string;
  logoUrl: string;
  heroVideoUrl: string;
  heroImageUrl: string;
  whatsappNumber: string;
  paymentInstructions: string;
  currency: string;
  accentColor: string;
}

const DEFAULT_RESTAURANT_CONFIG: RestaurantConfig = {
  enabled: false,
  restaurantName: '',
  tagline: '',
  logoUrl: '',
  heroVideoUrl: '',
  heroImageUrl: '',
  whatsappNumber: '',
  paymentInstructions: '',
  currency: 'USD',
  accentColor: '#FF4500',
};

// ─── Vertical type ───────────────────────────────────────────────────────────
export type StorefrontVertical = 'restaurant' | 'ecommerce' | 'beauty';

// ─── Unified hub return type ─────────────────────────────────────────────────
export interface StorefrontHubState {
  vertical: StorefrontVertical;
  // Ecommerce/beauty config (null for restaurant)
  storefrontConfig: StorefrontConfig | null;
  // Restaurant config (null for ecommerce/beauty)
  restaurantConfig: RestaurantConfig | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  // Ecommerce/beauty methods
  updateStorefrontConfig: (data: Partial<StorefrontConfig>) => Promise<any>;
  createStorefrontConfig: (data: Partial<StorefrontConfig>) => Promise<any>;
  resetStorefrontConfig: () => Promise<any>;
  deleteStorefrontConfig: () => Promise<any>;
  // Restaurant methods
  updateRestaurantConfig: (form: RestaurantConfig) => Promise<any>;
  setRestaurantField: (field: keyof RestaurantConfig, value: any) => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useStorefrontHub(verticalOverride?: StorefrontVertical): StorefrontHubState {
  const { tenant } = useAuth();

  // Detect vertical
  const vertical: StorefrontVertical = verticalOverride ?? detectVertical(tenant);

  // ── Ecommerce/beauty path ──────────────────────────────────────────────────
  const ecommerceHook = useStorefrontConfig();

  // ── Restaurant path ────────────────────────────────────────────────────────
  const [restaurantConfig, setRestaurantConfig] = useState<RestaurantConfig>(DEFAULT_RESTAURANT_CONFIG);
  const [restaurantLoading, setRestaurantLoading] = useState(true);
  const [restaurantSaving, setRestaurantSaving] = useState(false);
  const [restaurantError, setRestaurantError] = useState<string | null>(null);

  useEffect(() => {
    if (vertical !== 'restaurant') {
      setRestaurantLoading(false);
      return;
    }
    fetchApi('/restaurant-storefront/config')
      .then((data: any) => {
        const rc = data?.restaurantConfig || {};
        setRestaurantConfig({
          enabled:             rc.enabled             ?? false,
          restaurantName:      rc.restaurantName      ?? '',
          tagline:             rc.tagline             ?? '',
          logoUrl:             rc.logoUrl             ?? '',
          heroVideoUrl:        rc.heroVideoUrl        ?? '',
          heroImageUrl:        rc.heroImageUrl        ?? '',
          whatsappNumber:      rc.whatsappNumber      ?? '',
          paymentInstructions: rc.paymentInstructions ?? '',
          currency:            rc.currency            ?? 'USD',
          accentColor:         rc.accentColor         ?? '#FF4500',
        });
        setRestaurantError(null);
      })
      .catch((err: any) => setRestaurantError(err?.message ?? 'Error cargando configuración'))
      .finally(() => setRestaurantLoading(false));
  }, [vertical]);

  const updateRestaurantConfig = async (form: RestaurantConfig) => {
    setRestaurantSaving(true);
    try {
      await fetchApi('/restaurant-storefront/config', {
        method: 'PUT',
        body: JSON.stringify({ restaurantConfig: form }),
      });
      setRestaurantConfig(form);
      setRestaurantError(null);
      return { success: true };
    } catch (err: any) {
      const message = err?.message ?? 'Error al guardar';
      setRestaurantError(message);
      return { success: false, error: message };
    } finally {
      setRestaurantSaving(false);
    }
  };

  const setRestaurantField = (field: keyof RestaurantConfig, value: any) => {
    setRestaurantConfig((prev) => ({ ...prev, [field]: value }));
  };

  // ── Unified return ─────────────────────────────────────────────────────────
  if (vertical === 'restaurant') {
    return {
      vertical,
      storefrontConfig: null,
      restaurantConfig,
      loading: restaurantLoading,
      saving: restaurantSaving,
      error: restaurantError,
      updateStorefrontConfig: async () => ({ success: false }),
      createStorefrontConfig: async () => ({ success: false }),
      resetStorefrontConfig: async () => ({ success: false }),
      deleteStorefrontConfig: async () => ({ success: false }),
      updateRestaurantConfig,
      setRestaurantField,
    };
  }

  return {
    vertical,
    storefrontConfig: ecommerceHook.config,
    restaurantConfig: null,
    loading: ecommerceHook.loading,
    saving: ecommerceHook.saving,
    error: ecommerceHook.error,
    updateStorefrontConfig: ecommerceHook.updateConfig,
    createStorefrontConfig: ecommerceHook.createConfig,
    resetStorefrontConfig: ecommerceHook.resetConfig,
    deleteStorefrontConfig: ecommerceHook.deleteConfig,
    updateRestaurantConfig: async () => ({ success: false }),
    setRestaurantField: () => {},
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function detectVertical(tenant: any): StorefrontVertical {
  if (!tenant) return 'ecommerce';
  const modules = tenant.enabledModules || {};
  if (modules.restaurant || modules.tables || modules.kitchenDisplay || modules.menuEngineering) {
    return 'restaurant';
  }
  // Check vertical field
  if (tenant.vertical === 'beauty' || tenant.vertical === 'salon') {
    return 'beauty';
  }
  return 'ecommerce';
}
