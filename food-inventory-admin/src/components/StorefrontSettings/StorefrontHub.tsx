import { useState, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStorefrontHub, type StorefrontVertical } from './hooks/useStorefrontHub';
import { StorefrontSidebar, type SidebarSection } from './StorefrontSidebar';
import { SectionWrapper } from './SectionWrapper';
import { StorefrontProgress } from './StorefrontProgress';
import { StorefrontMiniPreview } from './StorefrontMiniPreview';
import { StorefrontSaveFooter } from './StorefrontSaveFooter';
import { useStorefrontProgress } from './hooks/useStorefrontProgress';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { fadeUp, scaleIn, DUR, EASE } from '../../lib/motion';
import {
  Palette, Type, Phone, CreditCard, Image, Share2,
  Search, MapPin, Rocket, ShoppingBag, Settings2,
} from 'lucide-react';

// ─── Lazy-loaded editors (keep bundle efficient) ─────────────────────────────
import { ThemeEditor } from './ThemeEditor';
import { SEOEditor } from './SEOEditor';
import { DomainSettings } from './DomainSettings';
import { SocialMediaEditor } from './SocialMediaEditor';
import { ContactInfoEditor } from './ContactInfoEditor';
import { WhatsAppIntegrationEditor } from './WhatsAppIntegrationEditor';
import { PaymentMethodsEditor } from './PaymentMethodsEditor';
import { GalleryEditor } from './GalleryEditor';
import { GoogleBusinessEditor } from './GoogleBusinessEditor';
import { PreviewModal } from './PreviewModal';
import { GoingLiveSection } from './GoingLiveSection';
import { RestaurantOrdersPanel } from './RestaurantOrdersPanel';

// ─── Section definitions ─────���───────────────────────────────────────────────
const ECOMMERCE_SECTIONS: SidebarSection[] = [
  { id: 'identity',  label: 'Identidad',        icon: Type,       complete: false },
  { id: 'design',    label: 'Diseno',           icon: Palette,    complete: false },
  { id: 'contact',   label: 'Contacto',         icon: Phone,      complete: false },
  { id: 'payments',  label: 'Pagos',            icon: CreditCard, complete: false },
  { id: 'gallery',   label: 'Galeria',          icon: Image,      complete: false },
  { id: 'social',    label: 'Redes Sociales',   icon: Share2,     complete: false },
  { id: 'seo',       label: 'SEO',              icon: Search,     complete: false },
  { id: 'google',    label: 'Google Business',  icon: MapPin,     complete: false },
  { id: 'publish',   label: 'Publicar',         icon: Rocket,     complete: false },
];

const RESTAURANT_SECTIONS: SidebarSection[] = [
  { id: 'identity',  label: 'Identidad',        icon: Type,       complete: false },
  { id: 'media',     label: 'Portada',          icon: Image,      complete: false },
  { id: 'contact',   label: 'Contacto y Pagos', icon: Phone,      complete: false },
  { id: 'design',    label: 'Color de Acento',  icon: Palette,    complete: false },
  { id: 'publish',   label: 'Publicar',         icon: Rocket,     complete: false },
];

// ─── Props ───────────────────────────────────────────────────────────────────
interface StorefrontHubProps {
  vertical?: StorefrontVertical;
}

// ─── Main component ────���─────────────────────────────────────────────────────
export default function StorefrontHub({ vertical: verticalProp }: StorefrontHubProps) {
  const hub = useStorefrontHub(verticalProp);
  const { vertical, loading, saving, error } = hub;

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'orders'>('settings');
  const [showPreview, setShowPreview] = useState(false);

  // Progress tracking
  const progressData = useStorefrontProgress(vertical, hub.storefrontConfig, hub.restaurantConfig);

  // Track which section is in viewport
  const handleVisibilityChange = useCallback((id: string, visible: boolean) => {
    if (visible) setActiveSection(id);
  }, []);

  // Navigate to section
  const handleNavigate = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return <HubSkeleton />;
  }

  // ── No config yet (ecommerce only) ────────────────────────────────────────
  if (vertical !== 'restaurant' && !hub.storefrontConfig) {
    return <CreateStorefrontForm hub={hub} />;
  }

  const isRestaurant = vertical === 'restaurant';
  const baseSections = isRestaurant ? RESTAURANT_SECTIONS : ECOMMERCE_SECTIONS;

  // Compute completion for sidebar
  const sections = baseSections.map((s) => ({
    ...s,
    complete: computeSectionComplete(s.id, hub),
  }));

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-sm px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Mi Sitio Web</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {isRestaurant ? 'Configura tu menu en linea' : 'Configura tu presencia online'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Status badge */}
            {getStatusBadge(hub)}

            {/* Preview button (ecommerce only) */}
            {!isRestaurant && hub.storefrontConfig && (
              <button
                onClick={() => setShowPreview(true)}
                className="px-4 py-2 rounded-lg bg-white/[0.06] text-gray-300 text-sm hover:bg-white/[0.1] transition-colors"
              >
                Previsualizar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Restaurant tab bar */}
      {isRestaurant && (
        <div className="border-b border-white/[0.06] bg-white/[0.02] px-6">
          <div className="max-w-[1600px] mx-auto">
            <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as 'settings' | 'orders')}>
              <TabsList className="bg-transparent border-0 h-auto p-0 gap-6">
                <TabsTrigger
                  value="settings"
                  className="bg-transparent border-0 border-b-2 border-transparent rounded-none px-0 pb-3 pt-3 data-[state=active]:border-blue-400 data-[state=active]:text-blue-400 text-gray-400"
                >
                  <Settings2 className="w-4 h-4 mr-2" />
                  Mi Sitio
                </TabsTrigger>
                <TabsTrigger
                  value="orders"
                  className="bg-transparent border-0 border-b-2 border-transparent rounded-none px-0 pb-3 pt-3 data-[state=active]:border-blue-400 data-[state=active]:text-blue-400 text-gray-400"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Pedidos
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      )}

      {/* Main content */}
      <AnimatePresence mode="wait">
        {activeTab === 'settings' ? (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
          >
            <div className="max-w-[1600px] mx-auto px-6 py-6">
              <div className="grid gap-6" style={{ gridTemplateColumns: '180px 1fr 340px' }}>
                {/* Left sidebar */}
                <div className="hidden lg:block">
                  <StorefrontSidebar
                    sections={sections}
                    activeId={activeSection}
                    onNavigate={handleNavigate}
                  />
                </div>

                {/* Center: scrollable sections */}
                <div className="space-y-6 min-w-0">
                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                      {error}
                    </div>
                  )}

                  {isRestaurant
                    ? <RestaurantSections hub={hub} onVisibilityChange={handleVisibilityChange} />
                    : <EcommerceSections hub={hub} onVisibilityChange={handleVisibilityChange} />
                  }
                </div>

                {/* Right panel: progress + preview + save footer */}
                <div className="hidden xl:block">
                  <div className="sticky top-6 space-y-5">
                    <StorefrontProgress data={progressData} onNavigate={handleNavigate} />
                    <StorefrontMiniPreview
                      vertical={vertical}
                      storefrontConfig={hub.storefrontConfig}
                      restaurantConfig={hub.restaurantConfig}
                    />
                    <StorefrontSaveFooter
                      isDirty={false}
                      dirtySections={[]}
                      onNavigate={handleNavigate}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="orders"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
            className="max-w-[1600px] mx-auto px-6 py-6"
          >
            <RestaurantOrdersPanel />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      {showPreview && hub.storefrontConfig && (
        <PreviewModal
          domain={hub.storefrontConfig.domain}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

// ─── Ecommerce/beauty sections ─────────���─────────────────────────────────────
function EcommerceSections({ hub, onVisibilityChange }: { hub: any; onVisibilityChange: (id: string, visible: boolean) => void }) {
  const config = hub.storefrontConfig;
  if (!config) return null;

  return (
    <>
      {/* 1. Identity — Theme (name, logo, colors) */}
      <SectionWrapper id="identity" title="Identidad y Tema" icon={Type} onVisibilityChange={onVisibilityChange}>
        <ThemeEditor config={config} onUpdate={hub.updateStorefrontConfig} saving={hub.saving} />
      </SectionWrapper>

      {/* 2. Contact */}
      <SectionWrapper id="contact" title="Contacto" icon={Phone} onVisibilityChange={onVisibilityChange}>
        <div className="space-y-6">
          <ContactInfoEditor config={config} onUpdate={hub.updateStorefrontConfig} saving={hub.saving} />
          <div className="border-t border-white/[0.06] pt-6">
            <WhatsAppIntegrationEditor config={config} onUpdate={hub.updateStorefrontConfig} saving={hub.saving} />
          </div>
        </div>
      </SectionWrapper>

      {/* 3. Payments */}
      <SectionWrapper id="payments" title="Metodos de Pago" icon={CreditCard} onVisibilityChange={onVisibilityChange}>
        <PaymentMethodsEditor />
      </SectionWrapper>

      {/* 4. Gallery */}
      <SectionWrapper id="gallery" title="Galeria" icon={Image} onVisibilityChange={onVisibilityChange}>
        <GalleryEditor />
      </SectionWrapper>

      {/* 5. Social Media */}
      <SectionWrapper id="social" title="Redes Sociales" icon={Share2} onVisibilityChange={onVisibilityChange}>
        <SocialMediaEditor config={config} onUpdate={hub.updateStorefrontConfig} saving={hub.saving} />
      </SectionWrapper>

      {/* 6. SEO */}
      <SectionWrapper id="seo" title="SEO" icon={Search} onVisibilityChange={onVisibilityChange}>
        <SEOEditor config={config} onUpdate={hub.updateStorefrontConfig} saving={hub.saving} />
      </SectionWrapper>

      {/* 7. Google Business */}
      <SectionWrapper id="google" title="Google Business" icon={MapPin} onVisibilityChange={onVisibilityChange}>
        <GoogleBusinessEditor config={config} onUpdate={hub.updateStorefrontConfig} saving={hub.saving} />
      </SectionWrapper>

      {/* 8. Publish — Domain + Activation + Going Live Ceremony */}
      <SectionWrapper id="publish" title="Publicar tu Sitio" icon={Rocket} onVisibilityChange={onVisibilityChange}>
        <div className="space-y-6">
          <GoingLiveSection
            isActive={config.isActive}
            domain={config.domain}
            onActivate={() => hub.updateStorefrontConfig({ isActive: true })}
            onDeactivate={() => hub.updateStorefrontConfig({ isActive: false })}
            saving={hub.saving}
          />
          <div className="border-t border-white/[0.06] pt-6">
            <p className="text-xs text-gray-500 mb-3 font-medium">Configuracion de dominio</p>
            <DomainSettings
              config={config}
              onUpdate={hub.updateStorefrontConfig}
              onDelete={hub.deleteStorefrontConfig}
              saving={hub.saving}
            />
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}

// ─── Restaurant sections ────────���────────────────────────────��───────────────
function RestaurantSections({ hub, onVisibilityChange }: { hub: any; onVisibilityChange: (id: string, visible: boolean) => void }) {
  const form = hub.restaurantConfig;
  if (!form) return null;

  const set = (field: string, value: any) => hub.setRestaurantField(field, value);
  const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(form.accentColor);

  return (
    <>
      {/* 1. Identity */}
      <SectionWrapper id="identity" title="Identidad del Restaurante" icon={Type} onVisibilityChange={onVisibilityChange}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-200">Nombre del Restaurante *</label>
              <input
                value={form.restaurantName}
                onChange={(e) => set('restaurantName', e.target.value)}
                placeholder="Ej: La Parrilla de Juan"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-200">Tagline (opcional)</label>
              <input
                value={form.tagline}
                onChange={(e) => set('tagline', e.target.value)}
                placeholder="Tu sabor favorito, siempre fresco"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-200">URL del Logo</label>
            <input
              value={form.logoUrl}
              onChange={(e) => set('logoUrl', e.target.value)}
              placeholder="https://cdn.ejemplo.com/logo.png"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
        </div>
      </SectionWrapper>

      {/* 2. Media */}
      <SectionWrapper id="media" title="Imagen y Video de Portada" icon={Image} onVisibilityChange={onVisibilityChange}>
        <div className="space-y-4">
          <p className="text-xs text-gray-400">El video tiene prioridad. Si no hay video, se usa la imagen.</p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-200">URL Video Hero</label>
            <input
              value={form.heroVideoUrl}
              onChange={(e) => set('heroVideoUrl', e.target.value)}
              placeholder="https://cdn.ejemplo.com/hero.mp4"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-200">URL Imagen Hero (fallback)</label>
            <input
              value={form.heroImageUrl}
              onChange={(e) => set('heroImageUrl', e.target.value)}
              placeholder="https://cdn.ejemplo.com/hero.jpg"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
        </div>
      </SectionWrapper>

      {/* 3. Contact & Payments */}
      <SectionWrapper id="contact" title="Contacto y Pagos" icon={Phone} onVisibilityChange={onVisibilityChange}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-200">WhatsApp para Pedidos *</label>
              <input
                value={form.whatsappNumber}
                onChange={(e) => set('whatsappNumber', e.target.value)}
                placeholder="584141234567"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              <p className="text-xs text-gray-500">Con codigo de pais, sin + (ej: 584141234567)</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-200">Moneda</label>
              <input
                value={form.currency}
                onChange={(e) => set('currency', e.target.value)}
                placeholder="USD"
                maxLength={10}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-200">Instrucciones de Pago *</label>
            <textarea
              rows={4}
              value={form.paymentInstructions}
              onChange={(e) => set('paymentInstructions', e.target.value)}
              placeholder={'Zelle: correo@ejemplo.com\nPago Movil: 0414-0000000 / V-00000000 / Banco'}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-gray-100 placeholder-gray-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
        </div>
      </SectionWrapper>

      {/* 4. Accent Color */}
      <SectionWrapper id="design" title="Color de Acento" icon={Palette} onVisibilityChange={onVisibilityChange}>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              value={form.accentColor}
              onChange={(e) => set('accentColor', e.target.value)}
              placeholder="#FF4500"
              className="w-40 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-gray-100 font-mono uppercase text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              maxLength={7}
            />
            {isValidHex && (
              <div
                className="w-10 h-10 rounded-lg border border-white/10 shadow-sm"
                style={{ backgroundColor: form.accentColor }}
              />
            )}
          </div>
          {!isValidHex && form.accentColor && (
            <p className="text-xs text-red-400">Formato invalido. Usa Hex: #FF4500</p>
          )}
          <div>
            <p className="text-xs text-gray-400 mb-2">Colores rapidos:</p>
            <div className="flex gap-2 flex-wrap">
              {['#FF4500', '#E63946', '#2563EB', '#16A34A', '#9333EA', '#F59E0B', '#0D9488'].map((c) => (
                <button
                  key={c}
                  onClick={() => set('accentColor', c)}
                  className="w-7 h-7 rounded-md border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: form.accentColor === c ? '#fff' : 'transparent',
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* 5. Publish + Save */}
      <SectionWrapper id="publish" title="Publicar tu Sitio" icon={Rocket} onVisibilityChange={onVisibilityChange}>
        <div className="space-y-5">
          <GoingLiveSection
            isActive={form.enabled}
            onActivate={async () => {
              const next = { ...form, enabled: true };
              hub.setRestaurantField('enabled', true);
              return hub.updateRestaurantConfig(next);
            }}
            onDeactivate={async () => {
              const next = { ...form, enabled: false };
              hub.setRestaurantField('enabled', false);
              return hub.updateRestaurantConfig(next);
            }}
            saving={hub.saving}
          />
          <button
            onClick={() => hub.updateRestaurantConfig(form)}
            disabled={hub.saving}
            className="w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {hub.saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Guardar Cambios
          </button>
        </div>
      </SectionWrapper>
    </>
  );
}

// (RestaurantOrdersPanel imported from separate file)

// ─── Skeleton loading ────────────────────────────────────────────────────────
function HubSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Header skeleton */}
      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-[1600px] mx-auto">
          <Skeleton className="h-7 w-48 bg-white/[0.06]" />
          <Skeleton className="h-4 w-72 mt-2 bg-white/[0.04]" />
        </div>
      </div>
      {/* Body skeleton */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid gap-6" style={{ gridTemplateColumns: '180px 1fr' }}>
          {/* Sidebar skeleton */}
          <div className="hidden lg:block space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg bg-white/[0.04]" />
            ))}
          </div>
          {/* Content skeleton */}
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl bg-white/[0.04]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create storefront form (ecommerce initial state) ────────────────────��───
function CreateStorefrontForm({ hub }: { hub: any }) {
  const [domain, setDomain] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await hub.createStorefrontConfig({
      domain,
      isActive: false,
      templateType: 'ecommerce',
      theme: { primaryColor: '#3B82F6', secondaryColor: '#10B981' },
      seo: { title: 'Mi Tienda Online', description: 'Descripcion de mi tienda', keywords: [] },
      socialMedia: {},
      contactInfo: { email: 'contacto@mitienda.com', phone: '+1234567890' },
    });
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
      <motion.div
        variants={scaleIn}
        initial="initial"
        animate="animate"
        className="max-w-md w-full mx-4 p-6 rounded-xl border border-white/[0.06] bg-white/[0.03]"
      >
        <h2 className="text-2xl font-bold text-gray-100 mb-2">Crear Storefront</h2>
        <p className="text-gray-400 text-sm mb-6">
          Aun no has configurado tu tienda online. Ingresa un dominio para comenzar:
        </p>
        <form onSubmit={handleCreate}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Dominio de tu tienda
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="mi-tienda"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Ejemplo: "mi-tienda" sera accesible en tu-dominio.smartkubik.com
            </p>
          </div>
          {hub.error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              {hub.error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Creando...' : 'Crear Storefront'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Status badge helper ─────────���───────────────────────────────────────────
function getStatusBadge(hub: any) {
  const isActive = hub.vertical === 'restaurant'
    ? hub.restaurantConfig?.enabled
    : hub.storefrontConfig?.isActive;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
      isActive
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-gray-500'}`} />
      {isActive ? 'En vivo' : 'Inactivo'}
    </span>
  );
}

// ─── Section completion helpers ───────��──────────────────────────────────────
function computeSectionComplete(sectionId: string, hub: any): boolean {
  if (hub.vertical === 'restaurant') {
    const f = hub.restaurantConfig;
    if (!f) return false;
    switch (sectionId) {
      case 'identity': return Boolean(f.restaurantName);
      case 'media':    return Boolean(f.heroVideoUrl || f.heroImageUrl);
      case 'contact':  return Boolean(f.whatsappNumber && f.paymentInstructions);
      case 'design':   return Boolean(f.accentColor && /^#[0-9A-Fa-f]{6}$/.test(f.accentColor));
      case 'publish':  return Boolean(f.enabled);
      default: return false;
    }
  }

  const c = hub.storefrontConfig;
  if (!c) return false;
  switch (sectionId) {
    case 'identity': return Boolean(c.theme?.primaryColor && c.theme?.secondaryColor);
    case 'contact':  return Boolean(c.contactInfo?.email && c.contactInfo?.phone);
    case 'payments': return false; // PaymentMethodsEditor manages its own state
    case 'gallery':  return false; // GalleryEditor manages its own state
    case 'social':   return Boolean(c.socialMedia?.instagram || c.socialMedia?.facebook);
    case 'seo':      return Boolean(c.seo?.title && c.seo?.description);
    case 'google':   return Boolean(c.googlePlaceId);
    case 'publish':  return Boolean(c.isActive);
    default: return false;
  }
}
