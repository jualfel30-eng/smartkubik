import { motion } from 'framer-motion';
import { scaleIn } from '../../lib/motion';
import { Globe, MessageCircle } from 'lucide-react';
import type { StorefrontConfig } from './hooks/useStorefrontConfig';
import type { RestaurantConfig, StorefrontVertical } from './hooks/useStorefrontHub';

interface StorefrontMiniPreviewProps {
  vertical: StorefrontVertical;
  storefrontConfig: StorefrontConfig | null;
  restaurantConfig: RestaurantConfig | null;
}

export function StorefrontMiniPreview({ vertical, storefrontConfig, restaurantConfig }: StorefrontMiniPreviewProps) {
  if (vertical === 'restaurant') {
    return <RestaurantPreview config={restaurantConfig} />;
  }
  return <EcommercePreview config={storefrontConfig} />;
}

// ─── Restaurant mini-preview ─────────────────────────────────────────────────
function RestaurantPreview({ config }: { config: RestaurantConfig | null }) {
  if (!config) return null;

  const accentColor = /^#[0-9A-Fa-f]{6}$/.test(config.accentColor)
    ? config.accentColor
    : '#FF4500';

  return (
    <motion.div variants={scaleIn} initial="initial" animate="animate">
      <p className="text-xs text-gray-500 mb-2 font-medium">Vista previa</p>
      <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-[#111] shadow-2xl">
        {/* Phone frame */}
        <div className="mx-auto" style={{ width: '100%', maxWidth: '320px' }}>
          {/* Status bar */}
          <div className="flex items-center justify-between px-4 py-1.5 bg-[#111]">
            <span className="text-[10px] text-gray-500">9:41</span>
            <div className="flex gap-1">
              <div className="w-3.5 h-2 rounded-sm bg-gray-600" />
            </div>
          </div>

          {/* Hero */}
          <div className="relative">
            {config.heroImageUrl ? (
              <div className="h-28 bg-cover bg-center" style={{ backgroundImage: `url(${config.heroImageUrl})` }} />
            ) : (
              <div className="h-28" style={{ background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}44)` }} />
            )}
            {/* Logo overlay */}
            {config.logoUrl && (
              <div className="absolute bottom-2 left-3 w-8 h-8 rounded-lg overflow-hidden border border-white/20 bg-black/40 backdrop-blur-sm">
                <img src={config.logoUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Name + tagline */}
          <div className="px-4 py-3 bg-[#0d0d0d]">
            <p className="text-sm font-bold text-white">
              {config.restaurantName || 'Tu Restaurante'}
              <span style={{ color: accentColor }}>.</span>
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {config.tagline || 'Tu menu en linea'}
            </p>
          </div>

          {/* Menu items placeholder */}
          <div className="px-4 py-3 bg-[#0a0a0a] space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-2 w-20 rounded bg-white/10" />
                <div className="h-1.5 w-14 rounded bg-white/[0.05] mt-1" />
              </div>
              <div className="h-2 w-8 rounded bg-white/10" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="h-2 w-24 rounded bg-white/10" />
                <div className="h-1.5 w-16 rounded bg-white/[0.05] mt-1" />
              </div>
              <div className="h-2 w-8 rounded bg-white/10" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="h-2 w-16 rounded bg-white/10" />
                <div className="h-1.5 w-12 rounded bg-white/[0.05] mt-1" />
              </div>
              <div className="h-2 w-8 rounded bg-white/10" />
            </div>
          </div>

          {/* CTA */}
          <div className="px-4 py-3 bg-[#0a0a0a]">
            <div
              className="w-full py-2 rounded-lg text-center text-xs font-bold text-white"
              style={{ backgroundColor: accentColor }}
            >
              Ver Menu
            </div>
          </div>

          {/* Bottom bar */}
          <div className="h-1.5 mx-auto w-24 rounded-full bg-white/10 my-2" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Ecommerce/beauty mini-preview ───────────────────────────────────────────
function EcommercePreview({ config }: { config: StorefrontConfig | null }) {
  if (!config) return null;

  const primary = config.theme?.primaryColor || '#3B82F6';
  const secondary = config.theme?.secondaryColor || '#10B981';

  return (
    <motion.div variants={scaleIn} initial="initial" animate="animate">
      <p className="text-xs text-gray-500 mb-2 font-medium">Vista previa</p>
      <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-[#111] shadow-2xl">
        <div className="mx-auto" style={{ width: '100%', maxWidth: '320px' }}>
          {/* Status bar */}
          <div className="flex items-center justify-between px-4 py-1.5 bg-[#111]">
            <span className="text-[10px] text-gray-500">9:41</span>
            <div className="flex gap-1">
              <div className="w-3.5 h-2 rounded-sm bg-gray-600" />
            </div>
          </div>

          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: primary }}>
            {config.theme?.logo ? (
              <img src={config.theme.logo} alt="" className="w-6 h-6 rounded object-cover" />
            ) : (
              <Globe className="w-4 h-4 text-white/70" />
            )}
            <span className="text-sm font-bold text-white truncate">
              {config.seo?.title || config.domain || 'Tu Tienda'}
            </span>
          </div>

          {/* Banner */}
          {(config.theme as any)?.bannerUrl ? (
            <div className="h-24 bg-cover bg-center" style={{ backgroundImage: `url(${(config.theme as any).bannerUrl})` }} />
          ) : (
            <div className="h-24" style={{ background: `linear-gradient(135deg, ${primary}33, ${secondary}33)` }} />
          )}

          {/* Content */}
          <div className="px-4 py-3 bg-[#0a0a0a] space-y-2">
            <p className="text-xs text-gray-300 line-clamp-2">
              {config.seo?.description || 'Descripcion de tu tienda'}
            </p>
            {/* Product placeholders */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-lg bg-white/[0.04] p-2">
                <div className="h-12 rounded bg-white/[0.06] mb-1.5" />
                <div className="h-2 w-16 rounded bg-white/10" />
                <div className="h-2 w-10 rounded bg-white/[0.05] mt-1" />
              </div>
              <div className="rounded-lg bg-white/[0.04] p-2">
                <div className="h-12 rounded bg-white/[0.06] mb-1.5" />
                <div className="h-2 w-14 rounded bg-white/10" />
                <div className="h-2 w-8 rounded bg-white/[0.05] mt-1" />
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="px-4 py-3 bg-[#0a0a0a]">
            <div className="flex gap-2">
              <div
                className="flex-1 py-2 rounded-lg text-center text-xs font-bold text-white"
                style={{ backgroundColor: primary }}
              >
                Comprar
              </div>
              <div className="w-10 py-2 rounded-lg flex items-center justify-center" style={{ backgroundColor: secondary }}>
                <MessageCircle className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="h-1.5 mx-auto w-24 rounded-full bg-white/10 my-2" />
        </div>
      </div>
    </motion.div>
  );
}
