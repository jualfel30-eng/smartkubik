import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StorefrontConfig } from './hooks/useStorefrontConfig';
import { scaleIn, SPRING, tapScale } from '../../lib/motion';
import { Upload, Loader2, Check } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';

// ─── Color presets ───────────────────────────────────────────────────────────
const COLOR_PRESETS = [
  { hex: '#3B82F6', label: 'Azul' },
  { hex: '#8B5CF6', label: 'Violeta' },
  { hex: '#EC4899', label: 'Rosa' },
  { hex: '#EF4444', label: 'Rojo' },
  { hex: '#F59E0B', label: 'Ambar' },
  { hex: '#10B981', label: 'Esmeralda' },
  { hex: '#06B6D4', label: 'Cyan' },
  { hex: '#1E293B', label: 'Oscuro' },
];

interface ThemeEditorProps {
  config: StorefrontConfig;
  onUpdate: (data: Partial<StorefrontConfig>) => Promise<any>;
  saving: boolean;
  onPreviewChange?: (theme: any) => void;
}

export function ThemeEditor({ config, onUpdate, saving, onPreviewChange }: ThemeEditorProps) {
  const [theme, setTheme] = useState(config.theme);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [saved, setSaved] = useState(false);
  const firstLogoRef = useRef(!config.theme?.logo);

  const updateTheme = (partial: Partial<typeof theme>) => {
    const next = { ...theme, ...partial };
    setTheme(next);
    onPreviewChange?.(next);
  };

  const handleSave = async () => {
    const { primaryColor, secondaryColor, logo, favicon, bannerUrl, videoUrl } = theme;
    const cleanTheme: any = { primaryColor, secondaryColor };
    if (logo) cleanTheme.logo = logo;
    if (favicon) cleanTheme.favicon = favicon;
    if (bannerUrl) cleanTheme.bannerUrl = bannerUrl;
    if (videoUrl) cleanTheme.videoUrl = videoUrl;
    const result = await onUpdate({ theme: cleanTheme });
    if (result.success) {
      toast.success('Tema actualizado correctamente');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setUploadingLogo(true);
      const data = await fetchApi('/admin/storefront/upload-logo', { method: 'POST', body: formData });
      updateTheme({ logo: data.data.logo });
      if (firstLogoRef.current) {
        toast.success('Tu marca va tomando forma');
        firstLogoRef.current = false;
      } else {
        toast.success('Logo subido');
      }
    } catch (error: any) {
      toast.error('Error al subir logo: ' + error.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setUploadingFavicon(true);
      const data = await fetchApi('/admin/storefront/upload-favicon', { method: 'POST', body: formData });
      updateTheme({ favicon: data.data.favicon });
      toast.success('Favicon subido');
    } catch (error: any) {
      toast.error('Error al subir favicon: ' + error.message);
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setUploadingBanner(true);
      const data = await fetchApi('/admin/storefront/upload-banner', { method: 'POST', body: formData });
      updateTheme({ bannerUrl: data.data.bannerUrl });
      toast.success('Banner subido');
    } catch (error: any) {
      toast.error('Error al subir banner: ' + error.message);
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setUploadingVideo(true);
      const data = await fetchApi('/admin/storefront/upload-video', { method: 'POST', body: formData });
      updateTheme({ videoUrl: data.data.videoUrl });
      toast.success('Video subido');
    } catch (error: any) {
      toast.error('Error al subir video: ' + error.message);
    } finally {
      setUploadingVideo(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-gray-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40';

  return (
    <div className="space-y-6">
      {/* Color Primario */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Color Primario</label>
        <div className="flex items-center gap-3 mb-2">
          <input
            type="color"
            value={theme.primaryColor}
            onChange={(e) => updateTheme({ primaryColor: e.target.value })}
            className="h-9 w-12 rounded-lg cursor-pointer border border-white/10 bg-transparent"
          />
          <input
            type="text"
            value={theme.primaryColor}
            onChange={(e) => updateTheme({ primaryColor: e.target.value })}
            className={inputClass}
            placeholder="#3B82F6"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {COLOR_PRESETS.map((preset) => (
            <motion.button
              key={preset.hex}
              whileTap={tapScale}
              onClick={() => updateTheme({ primaryColor: preset.hex })}
              className="w-6 h-6 rounded-md transition-all"
              style={{
                backgroundColor: preset.hex,
                boxShadow: theme.primaryColor === preset.hex ? `0 0 0 2px #0a0e1a, 0 0 0 3.5px ${preset.hex}` : 'none',
              }}
              title={preset.label}
            />
          ))}
        </div>
      </div>

      {/* Color Secundario */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Color Secundario</label>
        <div className="flex items-center gap-3 mb-2">
          <input
            type="color"
            value={theme.secondaryColor}
            onChange={(e) => updateTheme({ secondaryColor: e.target.value })}
            className="h-9 w-12 rounded-lg cursor-pointer border border-white/10 bg-transparent"
          />
          <input
            type="text"
            value={theme.secondaryColor}
            onChange={(e) => updateTheme({ secondaryColor: e.target.value })}
            className={inputClass}
            placeholder="#10B981"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {COLOR_PRESETS.map((preset) => (
            <motion.button
              key={preset.hex}
              whileTap={tapScale}
              onClick={() => updateTheme({ secondaryColor: preset.hex })}
              className="w-6 h-6 rounded-md transition-all"
              style={{
                backgroundColor: preset.hex,
                boxShadow: theme.secondaryColor === preset.hex ? `0 0 0 2px #0a0e1a, 0 0 0 3.5px ${preset.hex}` : 'none',
              }}
              title={preset.label}
            />
          ))}
        </div>
      </div>

      {/* Logo */}
      <UploadField
        label="Logo"
        preview={theme.logo ? (
          <AnimatePresence mode="wait">
            <motion.img
              key={theme.logo}
              variants={scaleIn}
              initial="initial"
              animate="animate"
              src={theme.logo}
              alt="Logo"
              className="h-20 w-auto max-w-[200px] object-contain rounded-lg border border-white/10 p-2 bg-white/[0.03]"
            />
          </AnimatePresence>
        ) : null}
        uploading={uploadingLogo}
        buttonText={theme.logo ? 'Cambiar Logo' : 'Subir Logo'}
        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
        onUpload={handleLogoUpload}
        hint="PNG, JPG, SVG o WEBP — max 2MB — 400px ancho recomendado"
      />

      {/* Favicon */}
      <UploadField
        label="Favicon"
        preview={theme.favicon ? (
          <AnimatePresence mode="wait">
            <motion.img
              key={theme.favicon}
              variants={scaleIn}
              initial="initial"
              animate="animate"
              src={theme.favicon}
              alt="Favicon"
              className="h-14 w-14 object-contain rounded-lg border border-white/10 p-2 bg-white/[0.03]"
            />
          </AnimatePresence>
        ) : null}
        uploading={uploadingFavicon}
        buttonText={theme.favicon ? 'Cambiar Favicon' : 'Subir Favicon'}
        accept="image/x-icon,image/png,image/vnd.microsoft.icon"
        onUpload={handleFaviconUpload}
        hint="ICO o PNG — max 500KB — 32x32 o 64x64px"
      />

      {/* Banner */}
      <UploadField
        label="Imagen de Fondo (Hero)"
        preview={(theme as any).bannerUrl ? (
          <AnimatePresence mode="wait">
            <motion.img
              key={(theme as any).bannerUrl}
              variants={scaleIn}
              initial="initial"
              animate="animate"
              src={(theme as any).bannerUrl}
              alt="Banner"
              className="h-24 w-40 object-cover rounded-lg border border-white/10 bg-white/[0.03]"
            />
          </AnimatePresence>
        ) : null}
        uploading={uploadingBanner}
        buttonText={(theme as any).bannerUrl ? 'Cambiar Banner' : 'Subir Banner'}
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onUpload={handleBannerUpload}
        hint="JPG, PNG o WEBP — max 5MB — 1920x1080 recomendado. Se usa si no hay video."
      />

      {/* Video */}
      <UploadField
        label="Video de Fondo (Hero)"
        preview={(theme as any).videoUrl ? (
          <AnimatePresence mode="wait">
            <motion.div key={(theme as any).videoUrl} variants={scaleIn} initial="initial" animate="animate">
              <video src={(theme as any).videoUrl} className="h-24 w-40 object-cover rounded-lg border border-white/10 bg-black" muted />
            </motion.div>
          </AnimatePresence>
        ) : null}
        uploading={uploadingVideo}
        buttonText={(theme as any).videoUrl ? 'Cambiar Video' : 'Subir Video'}
        accept="video/mp4,video/webm,video/ogg"
        onUpload={handleVideoUpload}
        hint="MP4, WEBM — max 10MB — 15-30s recomendado. Tiene prioridad sobre la imagen."
      />

      {/* Color preview */}
      <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4">
        <p className="text-xs text-gray-500 mb-3">Vista previa de colores</p>
        <div className="flex gap-3">
          <div className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: theme.primaryColor }}>
            Primario
          </div>
          <div className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: theme.secondaryColor }}>
            Secundario
          </div>
        </div>
      </div>

      {/* Save */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSave}
        disabled={saving}
        className="w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : saved ? (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING.bouncy}>
            <Check className="w-4 h-4" />
          </motion.span>
        ) : null}
        {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar Cambios'}
      </motion.button>
    </div>
  );
}

// ─── Reusable upload field ───────────────────────────────────────────────────
interface UploadFieldProps {
  label: string;
  preview: React.ReactNode;
  uploading: boolean;
  buttonText: string;
  accept: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hint: string;
}

function UploadField({ label, preview, uploading, buttonText, accept, onUpload, hint }: UploadFieldProps) {
  const inputId = `upload-${label.replace(/\s/g, '-').toLowerCase()}`;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-200 mb-2">{label}</label>
      <div className="flex items-start gap-3">
        {preview}
        <div className="flex-1">
          <input id={inputId} type="file" accept={accept} onChange={onUpload} className="hidden" />
          <motion.button
            whileTap={tapScale}
            type="button"
            onClick={() => document.getElementById(inputId)?.click()}
            disabled={uploading}
            className="inline-flex items-center px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-gray-300 hover:bg-white/[0.1] disabled:opacity-50 transition-colors"
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {uploading ? 'Subiendo...' : buttonText}
          </motion.button>
          <p className="mt-1.5 text-xs text-gray-500">{hint}</p>
        </div>
      </div>
    </div>
  );
}
