import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, ChevronRight, Copy, Share2, Check, Loader2,
  Palette, Image as ImageIcon, Search, Users, Phone, MessageCircle,
  CreditCard, ImagePlus, MapPin, ExternalLink, Camera, Plus, Eye, EyeOff,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import haptics from '@/lib/haptics';
import toast from '@/lib/toast';
import { SPRING, DUR, EASE, listItem, scaleIn, STAGGER } from '@/lib/motion';
import MobileActionSheet from '@/components/mobile/MobileActionSheet';

// ─── Preset colors ────────────────────────────────────────────────────────────
const PRESET_COLORS = [
  '#3B82F6', '#10B981', '#E63946', '#FF4500',
  '#9333EA', '#F59E0B', '#0D9488', '#EC4899',
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MobileStorefrontConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(null);
  const [draft, setDraft] = useState({});
  const [uploading, setUploading] = useState(null);

  // Load config
  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetchApi('/storefront');
        const data = response?.data ?? response ?? null;
        setConfig(data);
      } catch (err) {
        const msg = err?.message?.toLowerCase?.() ?? '';
        if (msg.includes('not found') || msg.includes('no se encontró') || msg.includes('404')) {
          setConfig(null);
        } else {
          toast.error('Error cargando configuración');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const storefrontUrl = config?.domain
    ? `https://${config.domain}.smartkubik.com`
    : '';

  // Save partial config
  const saveConfig = useCallback(async (partial) => {
    setSaving(true);
    try {
      const response = await fetchApi('/storefront', {
        method: 'PATCH',
        body: JSON.stringify(partial),
      });
      const data = response?.data ?? response ?? null;
      setConfig(data);
      toast.success('Guardado');
      return true;
    } catch (err) {
      toast.error('Error al guardar', { description: err.message });
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // Toggle active
  const handleToggle = async () => {
    const next = !config?.isActive;
    if (next) haptics.success(); else haptics.warning();
    await saveConfig({ isActive: next });
  };

  // Copy link
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(storefrontUrl);
      setCopied(true);
      haptics.success();
      toast.success('Enlace copiado');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('No se pudo copiar'); }
  };

  // Share
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: config?.seo?.title || 'Mi sitio web', url: storefrontUrl });
        haptics.success();
      } catch { /* cancelled */ }
    } else {
      handleCopy();
    }
  };

  // Open sheet with draft
  const openSheet = (key) => {
    setDraft(JSON.parse(JSON.stringify(config || {})));
    setSheetOpen(key);
    haptics.tap();
  };

  const closeSheet = () => setSheetOpen(null);

  // Save from sheet
  const saveSheet = async (partial) => {
    const ok = await saveConfig(partial);
    if (ok) closeSheet();
  };

  // File upload helper
  const uploadFile = async (endpoint, file, field) => {
    setUploading(field);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await fetchApi(endpoint, { method: 'POST', body: formData });
      haptics.success();
      toast.success('Archivo subido');
      return result.data;
    } catch {
      toast.error('Error subiendo archivo');
      return null;
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No config yet — show creation prompt
  if (!config) {
    return <CreateStorefrontPrompt onCreated={setConfig} />;
  }

  const theme = config.theme || {};
  const seo = config.seo || {};
  const social = config.socialMedia || {};
  const contact = config.contactInfo || {};
  const wa = config.whatsappIntegration || {};

  return (
    <div className="px-4 py-4 space-y-3 safe-bottom">
      {/* ── Master Toggle Card ──────────────────────────────────────────── */}
      <motion.div
        variants={listItem}
        initial="initial"
        animate="animate"
        className="bg-card border border-border p-4"
        style={{ borderRadius: 'var(--mobile-radius-lg)' }}
      >
        <button
          type="button"
          onClick={handleToggle}
          disabled={saving}
          className="w-full flex items-center justify-between no-tap-highlight"
        >
          <div className="flex items-center gap-3">
            <motion.div
              className="w-3 h-3 rounded-full"
              animate={{
                backgroundColor: config.isActive ? '#22c55e' : '#ef4444',
                scale: config.isActive ? [1, 1.3, 1] : 1,
              }}
              transition={SPRING.bouncy}
            />
            <div className="text-left">
              <span className="text-sm font-semibold">
                {config.isActive ? 'ACTIVO' : 'INACTIVO'}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                {config.domain ? `${config.domain}.smartkubik.com` : 'Sin dominio'}
              </p>
            </div>
          </div>
          <div className={cn(
            'relative w-12 h-7 rounded-full shrink-0 transition-colors',
            config.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/30',
          )}>
            <motion.span
              className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm"
              animate={{ x: config.isActive ? 20 : 0 }}
              transition={SPRING.snappy}
            />
          </div>
        </button>

        <AnimatePresence>
          {config.isActive && storefrontUrl && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: DUR.base, ease: EASE.out }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-[var(--mobile-radius-md)] border border-border bg-muted no-tap-highlight active:scale-[0.97] transition-transform"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  {copied ? 'Copiado!' : 'Copiar enlace'}
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-[var(--mobile-radius-md)] border border-border bg-primary text-primary-foreground no-tap-highlight active:scale-[0.97] transition-transform"
                >
                  <Share2 size={14} />
                  Compartir
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Live Preview Card ───────────────────────────────────────────── */}
      {(seo.title || config.domain) && (
        <motion.div
          variants={listItem}
          initial="initial"
          animate="animate"
          className="bg-card border border-border p-4"
          style={{ borderRadius: 'var(--mobile-radius-lg)' }}
        >
          <p className="text-xs text-muted-foreground font-medium mb-2">Vista previa</p>
          <div className="rounded-xl overflow-hidden border border-border">
            <div className="p-3 text-white font-bold text-sm flex items-center gap-2" style={{ backgroundColor: '#111' }}>
              {theme.logo && <img src={theme.logo} alt="" className="w-6 h-6 rounded-full object-cover" />}
              {seo.title || config.domain || 'Mi sitio'}
            </div>
            <div className="p-2.5 bg-gray-950 text-gray-300 text-xs">
              {seo.description || 'Descripción de tu negocio'}
            </div>
            <div className="p-2.5 bg-gray-900 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">Visitar</span>
              <div className="flex gap-1.5">
                <div className="px-3 py-1 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: theme.primaryColor || '#3B82F6' }}>
                  Primario
                </div>
                <div className="px-3 py-1 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: theme.secondaryColor || '#10B981' }}>
                  Secundario
                </div>
              </div>
            </div>
          </div>
          {storefrontUrl && (
            <button
              onClick={() => window.open(storefrontUrl, '_blank')}
              className="w-full flex items-center justify-center gap-1.5 mt-3 py-2 text-xs font-medium text-primary no-tap-highlight"
            >
              <ExternalLink size={14} />
              Ver sitio completo
            </button>
          )}
        </motion.div>
      )}

      {/* ── Setting Cards ───────────────────────────────────────────────── */}
      <motion.div
        variants={STAGGER(0.04, 0.06)}
        initial="initial"
        animate="animate"
        className="space-y-2"
      >
        {/* Theme */}
        <SettingCard
          icon={Palette}
          label="Tema y Colores"
          value={theme.primaryColor ? `${theme.primaryColor}` : 'Sin configurar'}
          colorSwatch={theme.primaryColor}
          onTap={() => openSheet('theme')}
        />

        {/* Images */}
        <SettingCard
          icon={ImageIcon}
          label="Logo e Imágenes"
          value={theme.logo ? 'Configurado' : 'Sin logo'}
          thumbnail={theme.logo}
          onTap={() => openSheet('images')}
        />

        {/* SEO */}
        <SettingCard
          icon={Search}
          label="SEO"
          value={seo.title || 'Sin configurar'}
          onTap={() => openSheet('seo')}
        />

        {/* Domain */}
        <SettingCard
          icon={Globe}
          label="Dominio"
          value={config.domain || 'Sin dominio'}
          onTap={() => openSheet('domain')}
        />

        {/* Social */}
        <SettingCard
          icon={Users}
          label="Redes Sociales"
          value={[social.instagram, social.facebook].filter(Boolean).length > 0
            ? `${[social.instagram, social.facebook].filter(Boolean).length} configurada(s)`
            : 'Sin configurar'}
          onTap={() => openSheet('social')}
        />

        {/* Contact */}
        <SettingCard
          icon={Phone}
          label="Contacto"
          value={contact.email || contact.phone || 'Sin configurar'}
          onTap={() => openSheet('contact')}
        />

        {/* WhatsApp */}
        <SettingCard
          icon={MessageCircle}
          label="WhatsApp"
          value={wa.enabled ? (wa.businessPhone || 'Activo') : 'Desactivado'}
          onTap={() => openSheet('whatsapp')}
        />

        {/* Payments */}
        <SettingCard
          icon={CreditCard}
          label="Métodos de Pago"
          value="Configurar"
          onTap={() => openSheet('payments')}
        />

        {/* Google */}
        <SettingCard
          icon={MapPin}
          label="Google Business"
          value={config.googlePlaceId ? 'Configurado' : 'Sin configurar'}
          onTap={() => openSheet('google')}
        />
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════════
          BOTTOM SHEETS
         ══════════════════════════════════════════════════════════════════ */}

      {/* ── Theme Sheet ─────────────────────────────────────────────────── */}
      <MobileActionSheet
        open={sheetOpen === 'theme'}
        onClose={closeSheet}
        title="Tema y Colores"
        footer={<SheetSaveButton saving={saving} onSave={() => {
          const { primaryColor, secondaryColor } = draft.theme || {};
          saveSheet({ theme: { ...config.theme, primaryColor, secondaryColor } });
        }} />}
      >
        <div className="px-4 py-4 space-y-5">
          <ColorPickerField
            label="Color Primario"
            hint="Botones y enlaces principales"
            value={draft.theme?.primaryColor || '#3B82F6'}
            onChange={(v) => setDraft((d) => ({ ...d, theme: { ...d.theme, primaryColor: v } }))}
          />
          <ColorPickerField
            label="Color Secundario"
            hint="Acentos y elementos secundarios"
            value={draft.theme?.secondaryColor || '#10B981'}
            onChange={(v) => setDraft((d) => ({ ...d, theme: { ...d.theme, secondaryColor: v } }))}
          />
          {/* Color preview */}
          <div className="flex gap-2">
            <div className="flex-1 py-2.5 rounded-[var(--mobile-radius-md)] text-center text-xs font-bold text-white"
              style={{ backgroundColor: draft.theme?.primaryColor || '#3B82F6' }}>
              Primario
            </div>
            <div className="flex-1 py-2.5 rounded-[var(--mobile-radius-md)] text-center text-xs font-bold text-white"
              style={{ backgroundColor: draft.theme?.secondaryColor || '#10B981' }}>
              Secundario
            </div>
          </div>
        </div>
      </MobileActionSheet>

      {/* ── Images Sheet ────────────────────────────────────────────────── */}
      <MobileActionSheet
        open={sheetOpen === 'images'}
        onClose={closeSheet}
        title="Logo e Imágenes"
        footer={<SheetSaveButton saving={saving} onSave={() => {
          saveSheet({ theme: { ...config.theme, logo: draft.theme?.logo, favicon: draft.theme?.favicon, bannerUrl: draft.theme?.bannerUrl, videoUrl: draft.theme?.videoUrl } });
        }} />}
      >
        <div className="px-4 py-4 space-y-5">
          <UploadField
            label="Logo"
            hint="PNG, JPG, SVG, WebP — Máx 2MB"
            value={draft.theme?.logo}
            uploading={uploading === 'logo'}
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            onUpload={async (file) => {
              const result = await uploadFile('/admin/storefront/upload-logo', file, 'logo');
              if (result?.logo) setDraft((d) => ({ ...d, theme: { ...d.theme, logo: result.logo } }));
            }}
            onClear={() => setDraft((d) => ({ ...d, theme: { ...d.theme, logo: '' } }))}
          />
          <UploadField
            label="Favicon"
            hint="ICO o PNG — 32x32 o 64x64px"
            value={draft.theme?.favicon}
            uploading={uploading === 'favicon'}
            accept="image/x-icon,image/png"
            onUpload={async (file) => {
              const result = await uploadFile('/admin/storefront/upload-favicon', file, 'favicon');
              if (result?.favicon) setDraft((d) => ({ ...d, theme: { ...d.theme, favicon: result.favicon } }));
            }}
            onClear={() => setDraft((d) => ({ ...d, theme: { ...d.theme, favicon: '' } }))}
            small
          />
          <UploadField
            label="Imagen de Fondo (Hero)"
            hint="JPG, PNG, WebP — 1920x1080px recomendado"
            value={draft.theme?.bannerUrl}
            uploading={uploading === 'banner'}
            accept="image/png,image/jpeg,image/webp"
            onUpload={async (file) => {
              const result = await uploadFile('/admin/storefront/upload-banner', file, 'banner');
              if (result?.bannerUrl) setDraft((d) => ({ ...d, theme: { ...d.theme, bannerUrl: result.bannerUrl } }));
            }}
            onClear={() => setDraft((d) => ({ ...d, theme: { ...d.theme, bannerUrl: '' } }))}
          />
          <UploadField
            label="Video de Fondo (Hero)"
            hint="MP4, WebM — Máx 10MB, 15-30s"
            value={draft.theme?.videoUrl}
            uploading={uploading === 'video'}
            accept="video/mp4,video/webm,video/ogg"
            isVideo
            onUpload={async (file) => {
              const result = await uploadFile('/admin/storefront/upload-video', file, 'video');
              if (result?.videoUrl) setDraft((d) => ({ ...d, theme: { ...d.theme, videoUrl: result.videoUrl } }));
            }}
            onClear={() => setDraft((d) => ({ ...d, theme: { ...d.theme, videoUrl: '' } }))}
          />
        </div>
      </MobileActionSheet>

      {/* ── SEO Sheet ───────────────────────────────────────────────────── */}
      <MobileActionSheet
        open={sheetOpen === 'seo'}
        onClose={closeSheet}
        title="SEO"
        footer={<SheetSaveButton saving={saving} onSave={() => {
          saveSheet({ seo: { title: draft.seo?.title, description: draft.seo?.description, keywords: draft.seo?.keywords || [] } });
        }} />}
      >
        <div className="px-4 py-4 space-y-4">
          <FieldGroup label={`Título (${(draft.seo?.title || '').length}/60)`}>
            <input
              type="text"
              maxLength={60}
              value={draft.seo?.title || ''}
              onChange={(e) => setDraft((d) => ({ ...d, seo: { ...d.seo, title: e.target.value } }))}
              placeholder="Mi Negocio — Servicios Profesionales"
              className="w-full px-3 py-2.5 rounded-[var(--mobile-radius-md)] bg-background border border-border text-sm outline-none focus:border-primary transition-colors"
            />
          </FieldGroup>
          <FieldGroup label={`Descripción (${(draft.seo?.description || '').length}/160)`}>
            <textarea
              rows={3}
              maxLength={160}
              value={draft.seo?.description || ''}
              onChange={(e) => setDraft((d) => ({ ...d, seo: { ...d.seo, description: e.target.value } }))}
              placeholder="Descripción corta de tu negocio para Google"
              className="w-full px-3 py-2.5 rounded-[var(--mobile-radius-md)] bg-background border border-border text-sm outline-none focus:border-primary transition-colors resize-none"
            />
          </FieldGroup>
          <KeywordsField
            keywords={draft.seo?.keywords || []}
            onChange={(keywords) => setDraft((d) => ({ ...d, seo: { ...d.seo, keywords } }))}
          />
          {/* SERP Preview */}
          {draft.seo?.title && (
            <div className="p-3 rounded-[var(--mobile-radius-md)] bg-muted/50 border border-border">
              <p className="text-[11px] text-muted-foreground mb-1">Vista previa en Google:</p>
              <p className="text-sm text-blue-500 font-medium truncate">{draft.seo.title}</p>
              <p className="text-[11px] text-emerald-600 truncate">{storefrontUrl || 'tudominio.smartkubik.com'}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{draft.seo.description || 'Sin descripción'}</p>
            </div>
          )}
        </div>
      </MobileActionSheet>

      {/* ── Domain Sheet ────────────────────────────────────────────────── */}
      <MobileActionSheet
        open={sheetOpen === 'domain'}
        onClose={closeSheet}
        title="Dominio"
        footer={<SheetSaveButton saving={saving} onSave={() => {
          saveSheet({ domain: draft.domain, templateType: draft.templateType });
        }} />}
      >
        <div className="px-4 py-4 space-y-4">
          <FieldGroup label="Subdominio">
            <div className="flex items-center gap-0">
              <input
                type="text"
                value={draft.domain || ''}
                onChange={(e) => setDraft((d) => ({ ...d, domain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                placeholder="mi-negocio"
                className="flex-1 px-3 py-2.5 rounded-l-[var(--mobile-radius-md)] bg-background border border-border border-r-0 text-sm outline-none focus:border-primary transition-colors font-mono"
              />
              <span className="px-3 py-2.5 bg-muted border border-border rounded-r-[var(--mobile-radius-md)] text-xs text-muted-foreground whitespace-nowrap">
                .smartkubik.com
              </span>
            </div>
          </FieldGroup>
          <FieldGroup label="Tipo de plantilla">
            <div className="grid grid-cols-2 gap-2">
              {['beauty', 'services', 'ecommerce', 'restaurant', 'premium'].map((t) => (
                <button
                  key={t}
                  onClick={() => { haptics.tap(); setDraft((d) => ({ ...d, templateType: t })); }}
                  className={cn(
                    'py-2.5 px-3 rounded-[var(--mobile-radius-md)] text-xs font-medium border no-tap-highlight transition-colors capitalize',
                    draft.templateType === t
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border',
                  )}
                >
                  {t === 'beauty' ? 'Belleza' : t === 'services' ? 'Servicios' : t === 'ecommerce' ? 'E-commerce' : t === 'restaurant' ? 'Restaurante' : 'Premium'}
                </button>
              ))}
            </div>
          </FieldGroup>
        </div>
      </MobileActionSheet>

      {/* ── Social Media Sheet ──────────────────────────────────────────── */}
      <MobileActionSheet
        open={sheetOpen === 'social'}
        onClose={closeSheet}
        title="Redes Sociales"
        footer={<SheetSaveButton saving={saving} onSave={() => {
          saveSheet({ socialMedia: draft.socialMedia });
        }} />}
      >
        <div className="px-4 py-4 space-y-4">
          {[
            { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/tu-negocio' },
            { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/tu-negocio' },
            { key: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/tu-negocio' },
            { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/tu-negocio' },
            { key: 'whatsapp', label: 'WhatsApp', placeholder: '+584141234567' },
          ].map(({ key, label, placeholder }) => (
            <FieldGroup key={key} label={label}>
              <input
                type={key === 'whatsapp' ? 'tel' : 'url'}
                value={draft.socialMedia?.[key] || ''}
                onChange={(e) => setDraft((d) => ({ ...d, socialMedia: { ...d.socialMedia, [key]: e.target.value } }))}
                placeholder={placeholder}
                className="w-full px-3 py-2.5 rounded-[var(--mobile-radius-md)] bg-background border border-border text-sm outline-none focus:border-primary transition-colors"
              />
            </FieldGroup>
          ))}
        </div>
      </MobileActionSheet>

      {/* ── Contact Sheet ───────────────────────────────────────────────── */}
      <MobileActionSheet
        open={sheetOpen === 'contact'}
        onClose={closeSheet}
        title="Contacto"
        footer={<SheetSaveButton saving={saving} onSave={() => {
          const ci = draft.contactInfo || {};
          const cleaned = { email: ci.email || '', phone: ci.phone || '' };
          if (ci.address?.street) cleaned.address = ci.address;
          saveSheet({ contactInfo: cleaned });
        }} />}
      >
        <div className="px-4 py-4 space-y-4">
          <FieldGroup label="Email *">
            <input
              type="email"
              value={draft.contactInfo?.email || ''}
              onChange={(e) => setDraft((d) => ({ ...d, contactInfo: { ...d.contactInfo, email: e.target.value } }))}
              placeholder="contacto@tu-negocio.com"
              className="w-full px-3 py-2.5 rounded-[var(--mobile-radius-md)] bg-background border border-border text-sm outline-none focus:border-primary transition-colors"
            />
          </FieldGroup>
          <FieldGroup label="Teléfono *">
            <input
              type="tel"
              inputMode="tel"
              value={draft.contactInfo?.phone || ''}
              onChange={(e) => setDraft((d) => ({ ...d, contactInfo: { ...d.contactInfo, phone: e.target.value } }))}
              placeholder="+584141234567"
              className="w-full px-3 py-2.5 rounded-[var(--mobile-radius-md)] bg-background border border-border text-sm outline-none focus:border-primary transition-colors"
            />
          </FieldGroup>
          <p className="text-xs text-muted-foreground font-medium pt-2">Dirección (opcional)</p>
          {['street', 'city', 'state', 'country', 'postalCode'].map((field) => (
            <FieldGroup key={field} label={{ street: 'Calle', city: 'Ciudad', state: 'Estado', country: 'País', postalCode: 'Código Postal' }[field]}>
              <input
                type="text"
                value={draft.contactInfo?.address?.[field] || ''}
                onChange={(e) => setDraft((d) => ({
                  ...d,
                  contactInfo: {
                    ...d.contactInfo,
                    address: { ...d.contactInfo?.address, [field]: e.target.value },
                  },
                }))}
                className="w-full px-3 py-2.5 rounded-[var(--mobile-radius-md)] bg-background border border-border text-sm outline-none focus:border-primary transition-colors"
              />
            </FieldGroup>
          ))}
        </div>
      </MobileActionSheet>

      {/* ── WhatsApp Sheet ──────────────────────────────────────────────── */}
      <MobileActionSheet
        open={sheetOpen === 'whatsapp'}
        onClose={closeSheet}
        title="WhatsApp"
        footer={<SheetSaveButton saving={saving} onSave={() => {
          saveSheet({ whatsappIntegration: draft.whatsappIntegration });
        }} />}
      >
        <div className="px-4 py-4 space-y-4">
          <ToggleField
            label="Habilitar WhatsApp"
            checked={draft.whatsappIntegration?.enabled ?? false}
            onChange={(v) => setDraft((d) => ({ ...d, whatsappIntegration: { ...d.whatsappIntegration, enabled: v } }))}
          />
          {draft.whatsappIntegration?.enabled && (
            <>
              <FieldGroup label="Teléfono de negocio *">
                <input
                  type="tel"
                  inputMode="tel"
                  value={draft.whatsappIntegration?.businessPhone || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, whatsappIntegration: { ...d.whatsappIntegration, businessPhone: e.target.value } }))}
                  placeholder="+584141234567"
                  className="w-full px-3 py-2.5 rounded-[var(--mobile-radius-md)] bg-background border border-border text-sm outline-none focus:border-primary transition-colors"
                />
              </FieldGroup>
              <FieldGroup label="Mensaje de bienvenida">
                <textarea
                  rows={3}
                  value={draft.whatsappIntegration?.welcomeMessage || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, whatsappIntegration: { ...d.whatsappIntegration, welcomeMessage: e.target.value } }))}
                  placeholder="¡Hola! Gracias por contactarnos..."
                  className="w-full px-3 py-2.5 rounded-[var(--mobile-radius-md)] bg-background border border-border text-sm outline-none focus:border-primary transition-colors resize-none"
                />
              </FieldGroup>
              <FieldGroup label="Texto del botón">
                <input
                  type="text"
                  value={draft.whatsappIntegration?.buttonText || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, whatsappIntegration: { ...d.whatsappIntegration, buttonText: e.target.value } }))}
                  placeholder="Contactar por WhatsApp"
                  className="w-full px-3 py-2.5 rounded-[var(--mobile-radius-md)] bg-background border border-border text-sm outline-none focus:border-primary transition-colors"
                />
              </FieldGroup>
              <ToggleField
                label="Enviar confirmación de pedido"
                checked={draft.whatsappIntegration?.autoSendOrderConfirmation ?? false}
                onChange={(v) => setDraft((d) => ({ ...d, whatsappIntegration: { ...d.whatsappIntegration, autoSendOrderConfirmation: v } }))}
              />
              <ToggleField
                label="Enviar instrucciones de pago"
                checked={draft.whatsappIntegration?.sendPaymentInstructions ?? false}
                onChange={(v) => setDraft((d) => ({ ...d, whatsappIntegration: { ...d.whatsappIntegration, sendPaymentInstructions: v } }))}
              />
              <ToggleField
                label="Incluir enlace de la tienda"
                checked={draft.whatsappIntegration?.includeStoreLink ?? false}
                onChange={(v) => setDraft((d) => ({ ...d, whatsappIntegration: { ...d.whatsappIntegration, includeStoreLink: v } }))}
              />
            </>
          )}
        </div>
      </MobileActionSheet>

      {/* ── Payments Sheet (info-only, links to desktop) ─────────────────── */}
      <MobileActionSheet
        open={sheetOpen === 'payments'}
        onClose={closeSheet}
        title="Métodos de Pago"
      >
        <div className="px-4 py-6 text-center">
          <CreditCard size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium mb-1">Gestión de pagos</p>
          <p className="text-xs text-muted-foreground mb-4">
            La configuración avanzada de métodos de pago está disponible en la versión de escritorio.
          </p>
          <button
            onClick={closeSheet}
            className="px-6 py-2.5 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground text-sm font-medium no-tap-highlight active:scale-[0.97] transition-transform"
          >
            Entendido
          </button>
        </div>
      </MobileActionSheet>

      {/* ── Google Sheet ────────────────────────────────────────────────── */}
      <MobileActionSheet
        open={sheetOpen === 'google'}
        onClose={closeSheet}
        title="Google Business"
        footer={<SheetSaveButton saving={saving} onSave={() => {
          saveSheet({ googlePlaceId: draft.googlePlaceId });
        }} />}
      >
        <div className="px-4 py-4 space-y-4">
          <FieldGroup label="Google Place ID">
            <input
              type="text"
              value={draft.googlePlaceId || ''}
              onChange={(e) => setDraft((d) => ({ ...d, googlePlaceId: e.target.value }))}
              placeholder="ChIJrTLr-GyuEmsRBfy61i59si0"
              className="w-full px-3 py-2.5 rounded-[var(--mobile-radius-md)] bg-background border border-border text-sm font-mono outline-none focus:border-primary transition-colors"
            />
          </FieldGroup>
          <div className="p-3 rounded-[var(--mobile-radius-md)] bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">
              Agrega tu Place ID de Google para mostrar mapa, reseñas y botón de reseña en tu sitio.
              Encuéntralo en Google Maps buscando tu negocio.
            </p>
          </div>
        </div>
      </MobileActionSheet>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CreateStorefrontPrompt({ onCreated }) {
  const [domain, setDomain] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!domain.trim()) return;
    setCreating(true);
    try {
      const response = await fetchApi('/storefront', {
        method: 'POST',
        body: JSON.stringify({
          domain: domain.toLowerCase().replace(/[^a-z0-9-]/g, ''),
          isActive: false,
          templateType: 'beauty',
          theme: { primaryColor: '#3B82F6', secondaryColor: '#10B981' },
          seo: { title: 'Mi Negocio', description: 'Bienvenido a mi negocio', keywords: [] },
          socialMedia: {},
          contactInfo: { email: '', phone: '' },
        }),
      });
      const data = response?.data ?? response;
      onCreated(data);
      haptics.success();
      toast.success('Storefront creado');
    } catch (err) {
      toast.error('Error al crear', { description: err.message });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="px-4 py-8 text-center">
      <Globe size={48} className="mx-auto text-muted-foreground mb-4" />
      <h2 className="text-lg font-bold mb-2">Crea tu sitio web</h2>
      <p className="text-sm text-muted-foreground mb-6">Elige un dominio para comenzar</p>
      <div className="flex items-center gap-0 mb-4">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          placeholder="mi-negocio"
          className="flex-1 px-3 py-3 rounded-l-[var(--mobile-radius-md)] bg-background border border-border border-r-0 text-sm outline-none focus:border-primary transition-colors font-mono"
        />
        <span className="px-3 py-3 bg-muted border border-border rounded-r-[var(--mobile-radius-md)] text-xs text-muted-foreground whitespace-nowrap">
          .smartkubik.com
        </span>
      </div>
      <button
        onClick={handleCreate}
        disabled={creating || !domain.trim()}
        className="w-full py-3 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground text-sm font-semibold no-tap-highlight active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {creating && <Loader2 size={16} className="animate-spin" />}
        Crear Storefront
      </button>
    </div>
  );
}

function SettingCard({ icon: Icon, label, value, thumbnail, colorSwatch, onTap }) {
  return (
    <motion.button
      variants={listItem}
      onClick={onTap}
      className="w-full flex items-center gap-3 p-4 bg-card border border-border no-tap-highlight active:bg-muted/30 transition-colors text-left"
      style={{ borderRadius: 'var(--mobile-radius-lg)' }}
    >
      <div className="w-9 h-9 rounded-[var(--mobile-radius-md)] bg-muted flex items-center justify-center shrink-0">
        <Icon size={16} className="text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium block">{label}</span>
        <span className="text-xs text-muted-foreground block mt-0.5 truncate">{value}</span>
      </div>
      {thumbnail && (
        <img src={thumbnail} alt="" className="w-8 h-8 rounded-md object-cover shrink-0 border border-border" />
      )}
      {colorSwatch && (
        <div className="w-6 h-6 rounded-full shrink-0 border border-border" style={{ backgroundColor: colorSwatch }} />
      )}
      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
    </motion.button>
  );
}

function FieldGroup({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function SheetSaveButton({ saving, onSave }) {
  return (
    <div className="px-4 py-3 border-t border-border">
      <button
        onClick={onSave}
        disabled={saving}
        className="w-full py-3 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground text-sm font-semibold no-tap-highlight active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving && <Loader2 size={16} className="animate-spin" />}
        Guardar
      </button>
    </div>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => { haptics.select(); onChange(!checked); }}
      className="w-full flex items-center justify-between py-2 no-tap-highlight"
    >
      <span className="text-sm font-medium">{label}</span>
      <div className={cn(
        'relative w-11 h-6 rounded-full shrink-0 transition-colors',
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
      )}>
        <motion.span
          className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
          animate={{ x: checked ? 20 : 0 }}
          transition={SPRING.snappy}
        />
      </div>
    </button>
  );
}

function ColorPickerField({ label, hint, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</label>
      <div className="grid grid-cols-4 gap-2 mb-2">
        {PRESET_COLORS.map((c) => {
          const selected = value === c;
          return (
            <button
              key={c}
              onClick={() => { haptics.tap(); onChange(c); }}
              className="relative flex items-center justify-center aspect-square no-tap-highlight"
            >
              <div className="w-10 h-10 rounded-full" style={{ backgroundColor: c }} />
              <AnimatePresence>
                {selected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={SPRING.bouncy}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center" style={{ borderColor: c }}>
                      <Check size={14} className="text-white drop-shadow" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          className="flex-1 px-3 py-2 rounded-[var(--mobile-radius-md)] bg-background border border-border text-sm font-mono uppercase outline-none focus:border-primary transition-colors"
        />
        {/^#[0-9A-Fa-f]{6}$/.test(value) && (
          <div className="w-8 h-8 rounded-md border border-border shrink-0" style={{ backgroundColor: value }} />
        )}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function UploadField({ label, hint, value, uploading, accept, isVideo, onUpload, onClear, small }) {
  const inputRef = useRef(null);
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</label>
      {value ? (
        <div className="relative rounded-[var(--mobile-radius-md)] overflow-hidden border border-border">
          {isVideo ? (
            <video src={value} className={cn('w-full object-cover', small ? 'h-16' : 'h-28')} muted />
          ) : (
            <img src={value} alt={label} className={cn('w-full object-cover', small ? 'h-16' : 'h-28')} />
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3 opacity-0 active:opacity-100 transition-opacity">
            <button onClick={() => inputRef.current?.click()} className="px-3 py-1.5 bg-white/90 text-black text-xs font-medium rounded-full">
              <Camera size={12} className="inline mr-1" /> Cambiar
            </button>
            <button onClick={onClear} className="px-3 py-1.5 bg-red-500/90 text-white text-xs font-medium rounded-full">
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            'w-full border-2 border-dashed border-border rounded-[var(--mobile-radius-md)] flex flex-col items-center justify-center gap-1 text-muted-foreground no-tap-highlight active:bg-muted/30 transition-colors',
            small ? 'h-16' : 'h-20',
          )}
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : (
            <>
              <Camera size={18} />
              <span className="text-[11px]">Subir</span>
            </>
          )}
        </button>
      )}
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
      <input ref={inputRef} type="file" accept={accept} onChange={handleFile} className="hidden" />
    </div>
  );
}

function KeywordsField({ keywords, onChange }) {
  const [input, setInput] = useState('');

  const addKeyword = () => {
    const kw = input.trim();
    if (kw && !keywords.includes(kw)) {
      onChange([...keywords, kw]);
      setInput('');
      haptics.tap();
    }
  };

  return (
    <FieldGroup label="Palabras clave">
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
          placeholder="Agregar keyword"
          className="flex-1 px-3 py-2 rounded-[var(--mobile-radius-md)] bg-background border border-border text-sm outline-none focus:border-primary transition-colors"
        />
        <button
          onClick={addKeyword}
          className="px-3 py-2 rounded-[var(--mobile-radius-md)] bg-muted border border-border text-sm no-tap-highlight active:scale-[0.97] transition-transform"
        >
          <Plus size={16} />
        </button>
      </div>
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {keywords.map((kw, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted rounded-full text-xs">
              {kw}
              <button onClick={() => { haptics.tap(); onChange(keywords.filter((_, j) => j !== i)); }} className="text-muted-foreground no-tap-highlight">
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
    </FieldGroup>
  );
}
