import { useMemo, useRef } from 'react';
import type { StorefrontConfig } from './useStorefrontConfig';
import type { RestaurantConfig, StorefrontVertical } from './useStorefrontHub';

export interface ProgressSection {
  id: string;
  label: string;
  complete: boolean;
  weight: number;
}

export interface StorefrontProgressData {
  percent: number;
  sections: ProgressSection[];
  completedCount: number;
  totalCount: number;
  nextSuggestion: string | null;
}

// ─── Suggestions ─────────────────────────────────────────────────────────────
const SUGGESTIONS: Record<string, string> = {
  identity:  'Agrega el nombre y logo de tu negocio',
  design:    'Elige los colores de tu marca',
  contact:   'Agrega tu telefono y email de contacto',
  payments:  'Configura al menos un metodo de pago',
  gallery:   'Sube fotos de tu trabajo para atraer clientes',
  social:    'Conecta tus redes sociales',
  seo:       'Optimiza tu SEO para aparecer en Google',
  google:    'Vincula tu perfil de Google Business',
  publish:   'Activa tu sitio para que sea visible al publico',
  media:     'Agrega una imagen o video de portada',
};

// ─── Ecommerce weights ───────────────────────────────────────────────────────
const ECOMMERCE_SECTIONS: Omit<ProgressSection, 'complete'>[] = [
  { id: 'identity', label: 'Identidad',        weight: 15 },
  { id: 'contact',  label: 'Contacto',         weight: 12 },
  { id: 'payments', label: 'Pagos',            weight: 15 },
  { id: 'gallery',  label: 'Galeria',          weight: 10 },
  { id: 'social',   label: 'Redes Sociales',   weight: 5  },
  { id: 'seo',      label: 'SEO',              weight: 10 },
  { id: 'google',   label: 'Google Business',  weight: 8  },
  { id: 'publish',  label: 'Publicar',         weight: 15 },
];

// ─── Restaurant weights ──────────────────────────────────────────────────────
const RESTAURANT_SECTIONS: Omit<ProgressSection, 'complete'>[] = [
  { id: 'identity', label: 'Identidad',        weight: 20 },
  { id: 'media',    label: 'Portada',          weight: 10 },
  { id: 'contact',  label: 'Contacto y Pagos', weight: 25 },
  { id: 'design',   label: 'Color de Acento',  weight: 5  },
  { id: 'publish',  label: 'Publicar',         weight: 20 },
];

// ─── Completion checks ──────────────────────────────────────────────────────
function isEcommerceComplete(id: string, config: StorefrontConfig): boolean {
  switch (id) {
    case 'identity': return Boolean(config.theme?.logo || (config.theme?.primaryColor && config.theme?.secondaryColor));
    case 'contact':  return Boolean(config.contactInfo?.email && config.contactInfo?.phone);
    case 'payments': return false; // Cannot check from here — PaymentMethodsEditor is independent
    case 'gallery':  return false; // Cannot check from here — GalleryEditor is independent
    case 'social':   return Boolean(config.socialMedia?.instagram || config.socialMedia?.facebook);
    case 'seo':      return Boolean(config.seo?.title && config.seo?.description);
    case 'google':   return Boolean(config.googlePlaceId);
    case 'publish':  return Boolean(config.isActive);
    default: return false;
  }
}

function isRestaurantComplete(id: string, config: RestaurantConfig): boolean {
  switch (id) {
    case 'identity': return Boolean(config.restaurantName);
    case 'media':    return Boolean(config.heroVideoUrl || config.heroImageUrl);
    case 'contact':  return Boolean(config.whatsappNumber && config.paymentInstructions);
    case 'design':   return Boolean(config.accentColor && /^#[0-9A-Fa-f]{6}$/.test(config.accentColor));
    case 'publish':  return Boolean(config.enabled);
    default: return false;
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useStorefrontProgress(
  vertical: StorefrontVertical,
  storefrontConfig: StorefrontConfig | null,
  restaurantConfig: RestaurantConfig | null,
): StorefrontProgressData {
  return useMemo(() => {
    const baseSections = vertical === 'restaurant' ? RESTAURANT_SECTIONS : ECOMMERCE_SECTIONS;

    const sections: ProgressSection[] = baseSections.map((s) => ({
      ...s,
      complete: vertical === 'restaurant'
        ? (restaurantConfig ? isRestaurantComplete(s.id, restaurantConfig) : false)
        : (storefrontConfig ? isEcommerceComplete(s.id, storefrontConfig) : false),
    }));

    const totalWeight = sections.reduce((sum, s) => sum + s.weight, 0);
    const completedWeight = sections.reduce((sum, s) => sum + (s.complete ? s.weight : 0), 0);

    // Endowed progress: base 10% just for having an account
    const endowedBase = 10;
    const rawPercent = endowedBase + ((completedWeight / totalWeight) * (100 - endowedBase));
    const percent = Math.min(100, Math.round(rawPercent));

    const completedCount = sections.filter((s) => s.complete).length;
    const totalCount = sections.length;

    // Next suggestion: first incomplete section
    const nextIncomplete = sections.find((s) => !s.complete);
    const nextSuggestion = nextIncomplete ? (SUGGESTIONS[nextIncomplete.id] ?? null) : null;

    return { percent, sections, completedCount, totalCount, nextSuggestion };
  }, [vertical, storefrontConfig, restaurantConfig]);
}
