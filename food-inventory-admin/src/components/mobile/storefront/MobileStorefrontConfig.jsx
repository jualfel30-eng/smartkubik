import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, ChevronRight, Copy, Share2, Check, Loader2,
  Type, Image as ImageIcon, Palette, MessageCircle, CreditCard,
  ExternalLink, Plus, Camera,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import haptics from '@/lib/haptics';
import toast from '@/lib/toast';
import { SPRING, DUR, EASE, listItem, scaleIn, STAGGER } from '@/lib/motion';
import { useAuth } from '@/hooks/use-auth';
import MobileActionSheet from '@/components/mobile/MobileActionSheet';

// ─── Defaults ─────────────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
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

const PRESET_COLORS = [
  '#FF4500', '#E63946', '#2563EB', '#16A34A',
  '#9333EA', '#F59E0B', '#0D9488', '#EC4899',
];

const ZELLE_TEMPLATE = 'Zelle:\nCorreo: \nNombre: \n';
const PAGO_MOVIL_TEMPLATE = 'Pago Móvil:\nTeléfono: 04XX-XXXXXXX\nCédula: V-XXXXXXXX\nBanco: \n';

// ─── Image resize helper ─────────────────────────────────────────────────────
function resizeImage(file, maxWidth = 800) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        if (img.width <= maxWidth) { resolve(file); return; }
        const canvas = document.createElement('canvas');
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MobileStorefrontConfig() {
  const { tenant } = useAuth();
  const [form, setForm] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storefrontDomain, setStorefrontDomain] = useState('');
  const [copied, setCopied] = useState(false);

  // Sheet states
  const [sheetOpen, setSheetOpen] = useState(null); // 'name' | 'images' | 'color' | 'whatsapp' | 'payment'
  const [uploading, setUploading] = useState(null); // 'logo' | 'hero'

  // Draft for sheet edits (so cancel doesn't save)
  const [draft, setDraft] = useState({});

  // Load config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const [configRes, storefrontRes] = await Promise.all([
          fetchApi('/restaurant-storefront/config'),
          fetchApi('/admin/storefront').catch(() => null),
        ]);
        const rc = configRes?.restaurantConfig || {};
        setForm({
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
        const domain = storefrontRes?.data?.domain || storefrontRes?.domain || '';
        setStorefrontDomain(domain);
      } catch {
        toast.error('Error cargando configuración');
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  const storefrontUrl = storefrontDomain
    ? `https://${storefrontDomain}.smartkubik.com`
    : '';

  // Save config
  const saveConfig = useCallback(async (updatedForm) => {
    setSaving(true);
    try {
      await fetchApi('/restaurant-storefront/config', {
        method: 'PUT',
        body: JSON.stringify({ restaurantConfig: updatedForm }),
      });
      setForm(updatedForm);
      toast.success('Configuración guardada');
    } catch (err) {
      toast.error('Error al guardar', { description: err.message });
    } finally {
      setSaving(false);
    }
  }, []);

  // Toggle enabled
  const handleToggle = async () => {
    const next = { ...form, enabled: !form.enabled };
    if (next.enabled) {
      haptics.success();
    } else {
      haptics.warning();
    }
    await saveConfig(next);
  };

  // Copy link
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(storefrontUrl);
      setCopied(true);
      haptics.success();
      toast.success('Enlace copiado');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  // Share
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: form.restaurantName || 'Mi sitio web',
          url: storefrontUrl,
        });
        haptics.success();
      } catch {
        // user cancelled share sheet
      }
    } else {
      handleCopy();
    }
  };

  // Open sheet with draft
  const openSheet = (key) => {
    setDraft({ ...form });
    setSheetOpen(key);
    haptics.tap();
  };

  const closeSheet = () => setSheetOpen(null);

  // Save from sheet
  const saveSheet = async () => {
    await saveConfig(draft);
    closeSheet();
  };

  // Image upload
  const handleImageUpload = async (file, field) => {
    setUploading(field === 'logoUrl' ? 'logo' : 'hero');
    try {
      const resized = await resizeImage(file);
      const formData = new FormData();
      formData.append('file', resized, file.name);
      const result = await fetchApi('/uploads/marketing/image', {
        method: 'POST',
        body: formData,
      });
      const url = result.url || result.data?.url || '';
      setDraft((d) => ({ ...d, [field]: url }));
      haptics.success();
      toast.success('Imagen subida');
    } catch {
      toast.error('Error subiendo imagen');
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

  const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(form.accentColor);

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
                backgroundColor: form.enabled ? '#22c55e' : '#ef4444',
                scale: form.enabled ? [1, 1.3, 1] : 1,
              }}
              transition={SPRING.bouncy}
            />
            <div className="text-left">
              <span className="text-sm font-semibold">
                Estado: {form.enabled ? 'ACTIVO' : 'INACTIVO'}
              </span>
              {!form.enabled && (
                <p className="text-xs text-muted-foreground mt-0.5">Sitio desactivado</p>
              )}
            </div>
          </div>
          <div
            className={cn(
              'relative w-12 h-7 rounded-full shrink-0 transition-colors',
              form.enabled ? 'bg-emerald-500' : 'bg-muted-foreground/30',
            )}
          >
            <motion.span
              className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm"
              animate={{ x: form.enabled ? 20 : 0 }}
              transition={SPRING.snappy}
            />
          </div>
        </button>

        <AnimatePresence>
          {form.enabled && storefrontUrl && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: DUR.base, ease: EASE.out }}
              className="overflow-hidden"
            >
              <p className="text-xs text-muted-foreground mt-3 mb-2 truncate">
                {storefrontUrl}
              </p>
              <div className="flex gap-2">
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
      {form.restaurantName && (
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
              {form.logoUrl && (
                <img src={form.logoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
              )}
              {form.restaurantName}
              {isValidHex && <span style={{ color: form.accentColor }}>.</span>}
            </div>
            <div className="p-2.5 bg-gray-950 text-gray-300 text-xs">
              {form.tagline || 'Tu negocio en línea'}
            </div>
            <div className="p-2.5 bg-gray-900 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">Reservar / Pedir</span>
              {isValidHex && (
                <div
                  className="px-3 py-1 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: form.accentColor }}
                >
                  Ver más
                </div>
              )}
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
        variants={STAGGER(0.05, 0.08)}
        initial="initial"
        animate="animate"
        className="space-y-2"
      >
        <SettingCard
          icon={Type}
          label="Nombre y Marca"
          value={form.restaurantName || 'Sin configurar'}
          onTap={() => openSheet('name')}
        />
        <SettingCard
          icon={ImageIcon}
          label="Logo e Imágenes"
          value={form.logoUrl ? 'Configurado' : 'Sin logo'}
          thumbnail={form.logoUrl}
          onTap={() => openSheet('images')}
        />
        <SettingCard
          icon={Palette}
          label="Color de Acento"
          value={form.accentColor}
          colorSwatch={isValidHex ? form.accentColor : null}
          onTap={() => openSheet('color')}
        />
        <SettingCard
          icon={MessageCircle}
          label="WhatsApp"
          value={form.whatsappNumber ? `+${form.whatsappNumber}` : 'Sin configurar'}
          onTap={() => openSheet('whatsapp')}
        />
        <SettingCard
          icon={CreditCard}
          label="Info de Pago"
          value={form.paymentInstructions?.split('\n')[0] || 'Sin configurar'}
          onTap={() => openSheet('payment')}
        />
      </motion.div>

      {/* ── Bottom Sheets ───────────────────────────────────────────────── */}

      {/* Name & Brand Sheet */}
      <MobileActionSheet
        open={sheetOpen === 'name'}
        onClose={closeSheet}
        title="Nombre y Marca"
        footer={<SheetSaveButton saving={saving} onSave={saveSheet} />}
      >
        <div className="px-4 py-4 space-y-4">
          <FieldGroup label="Nombre del negocio">
            <input
              type="text"
              value={draft.restaurantName || ''}
              onChange={(e) => setDraft((d) => ({ ...d, restaurantName: e.target.value }))}
              placeholder="Ej: Barbería El Pulpo"
              className="w-full px-3 py-2.5 rounded-[var(--mobile-radius-md)] bg-background border border-border text-sm outline-none focus:border-primary transition-colors"
            />
          </FieldGroup>
          <FieldGroup label="Tagline (opcional)">
            <input
              type="text"
              value={draft.tagline || ''}
              onChange={(e) => setDraft((d) => ({ ...d, tagline: e.target.value }))}
              placeholder="Tu estilo, nuestra pasión"
              className="w-full px-3 py-2.5 rounded-[var(--mobile-radius-md)] bg-background border border-border text-sm outline-none focus:border-primary transition-colors"
            />
          </FieldGroup>
        </div>
      </MobileActionSheet>

      {/* Images Sheet */}
      <MobileActionSheet
        open={sheetOpen === 'images'}
        onClose={closeSheet}
        title="Logo e Imágenes"
        footer={<SheetSaveButton saving={saving} onSave={saveSheet} />}
      >
        <div className="px-4 py-4 space-y-5">
          <ImageUploadField
            label="Logo"
            value={draft.logoUrl}
            uploading={uploading === 'logo'}
            onUpload={(file) => handleImageUpload(file, 'logoUrl')}
            onClear={() => setDraft((d) => ({ ...d, logoUrl: '' }))}
          />
          <ImageUploadField
            label="Imagen de portada"
            value={draft.heroImageUrl}
            uploading={uploading === 'hero'}
            onUpload={(file) => handleImageUpload(file, 'heroImageUrl')}
            onClear={() => setDraft((d) => ({ ...d, heroImageUrl: '' }))}
          />
          <FieldGroup label="URL Video de portada (opcional)">
            <input
              type="url"
              value={draft.heroVideoUrl || ''}
              onChange={(e) => setDraft((d) => ({ ...d, heroVideoUrl: e.target.value }))}
              placeholder="https://cdn.ejemplo.com/hero.mp4"
              className="w-full px-3 py-2.5 rounded-[var(--mobile-radius-md)] bg-background border border-border text-sm outline-none focus:border-primary transition-colors"
            />
            <p className="text-[11px] text-muted-foreground mt-1">El video tiene prioridad sobre la imagen.</p>
          </FieldGroup>
        </div>
      </MobileActionSheet>

      {/* Color Sheet */}
      <MobileActionSheet
        open={sheetOpen === 'color'}
        onClose={closeSheet}
        title="Color de Acento"
        footer={<SheetSaveButton saving={saving} onSave={saveSheet} />}
      >
        <div className="px-4 py-4 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {PRESET_COLORS.map((c) => {
              const selected = draft.accentColor === c;
              return (
                <button
                  key={c}
                  onClick={() => { haptics.tap(); setDraft((d) => ({ ...d, accentColor: c })); }}
                  className="relative flex items-center justify-center aspect-square no-tap-highlight"
                >
                  <div
                    className="w-12 h-12 rounded-full"
                    style={{ backgroundColor: c }}
                  />
                  <AnimatePresence>
                    {selected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={SPRING.bouncy}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <div
                          className="w-14 h-14 rounded-full border-2 flex items-center justify-center"
                          style={{ borderColor: c }}
                        >
                          <Check size={16} className="text-white drop-shadow" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>
          <FieldGroup label="Color personalizado (hex)">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={draft.accentColor || ''}
                onChange={(e) => setDraft((d) => ({ ...d, accentColor: e.target.value }))}
                placeholder="#FF4500"
                maxLength={7}
                className="flex-1 px-3 py-2.5 rounded-[var(--mobile-radius-md)] bg-background border border-border text-sm font-mono uppercase outline-none focus:border-primary transition-colors"
              />
              {/^#[0-9A-Fa-f]{6}$/.test(draft.accentColor) && (
                <div
                  className="w-10 h-10 rounded-lg border border-border shrink-0"
                  style={{ backgroundColor: draft.accentColor }}
                />
              )}
            </div>
          </FieldGroup>
          {/* Mini preview */}
          {/^#[0-9A-Fa-f]{6}$/.test(draft.accentColor) && (
            <div className="rounded-xl overflow-hidden border border-border">
              <div className="p-3 bg-gray-900 flex items-center justify-between">
                <span className="text-xs text-gray-400">Así se verá tu botón:</span>
                <div
                  className="px-4 py-1.5 rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: draft.accentColor }}
                >
                  Reservar
                </div>
              </div>
            </div>
          )}
        </div>
      </MobileActionSheet>

      {/* WhatsApp Sheet */}
      <MobileActionSheet
        open={sheetOpen === 'whatsapp'}
        onClose={closeSheet}
        title="WhatsApp"
        footer={<SheetSaveButton saving={saving} onSave={saveSheet} />}
      >
        <div className="px-4 py-4 space-y-4">
          <FieldGroup label="Número de WhatsApp">
            <input
              type="tel"
              inputMode="tel"
              value={draft.whatsappNumber || ''}
              onChange={(e) => setDraft((d) => ({ ...d, whatsappNumber: e.target.value.replace(/\D/g, '') }))}
              placeholder="584141234567"
              className="w-full px-3 py-2.5 rounded-[var(--mobile-radius-md)] bg-background border border-border text-sm outline-none focus:border-primary transition-colors"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Con código de país, sin + (ej: 584141234567)
            </p>
          </FieldGroup>
        </div>
      </MobileActionSheet>

      {/* Payment Sheet */}
      <MobileActionSheet
        open={sheetOpen === 'payment'}
        onClose={closeSheet}
        title="Información de Pago"
        footer={<SheetSaveButton saving={saving} onSave={saveSheet} />}
      >
        <div className="px-4 py-4 space-y-4">
          <FieldGroup label="Instrucciones de pago">
            <textarea
              rows={6}
              value={draft.paymentInstructions || ''}
              onChange={(e) => setDraft((d) => ({ ...d, paymentInstructions: e.target.value }))}
              placeholder={'Zelle: correo@ejemplo.com\nPago Móvil: 0414-0000000 / V-00000000 / Banco'}
              className="w-full px-3 py-2.5 rounded-[var(--mobile-radius-md)] bg-background border border-border text-sm outline-none focus:border-primary transition-colors resize-none"
            />
          </FieldGroup>
          <div className="flex gap-2">
            <button
              onClick={() => {
                haptics.tap();
                setDraft((d) => ({
                  ...d,
                  paymentInstructions: (d.paymentInstructions || '') + (d.paymentInstructions ? '\n\n' : '') + ZELLE_TEMPLATE,
                }));
              }}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-[var(--mobile-radius-md)] border border-border bg-muted no-tap-highlight active:scale-[0.97] transition-transform"
            >
              <Plus size={12} /> Zelle
            </button>
            <button
              onClick={() => {
                haptics.tap();
                setDraft((d) => ({
                  ...d,
                  paymentInstructions: (d.paymentInstructions || '') + (d.paymentInstructions ? '\n\n' : '') + PAGO_MOVIL_TEMPLATE,
                }));
              }}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-[var(--mobile-radius-md)] border border-border bg-muted no-tap-highlight active:scale-[0.97] transition-transform"
            >
              <Plus size={12} /> Pago Móvil
            </button>
          </div>
        </div>
      </MobileActionSheet>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function ImageUploadField({ label, value, uploading, onUpload, onClear }) {
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
          <img src={value} alt={label} className="w-full h-32 object-cover" />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3 opacity-0 active:opacity-100 transition-opacity">
            <button
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 bg-white/90 text-black text-xs font-medium rounded-full"
            >
              <Camera size={12} className="inline mr-1" />
              Cambiar
            </button>
            <button
              onClick={onClear}
              className="px-3 py-1.5 bg-red-500/90 text-white text-xs font-medium rounded-full"
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-24 border-2 border-dashed border-border rounded-[var(--mobile-radius-md)] flex flex-col items-center justify-center gap-1 text-muted-foreground no-tap-highlight active:bg-muted/30 transition-colors"
        >
          {uploading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <Camera size={20} />
              <span className="text-xs">Subir imagen</span>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}
