import { useState } from 'react';
import { StorefrontConfig } from './hooks/useStorefrontConfig';
import { Upload } from 'lucide-react';
import { fetchApi } from '../../lib/api';

interface ThemeEditorProps {
  config: StorefrontConfig;
  onUpdate: (data: Partial<StorefrontConfig>) => Promise<any>;
  saving: boolean;
}

export function ThemeEditor({ config, onUpdate, saving }: ThemeEditorProps) {
  const [theme, setTheme] = useState(config.theme);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  const handleSave = async () => {
    // Enviar solo campos válidos del DTO (sin _id de Mongoose)
    const { primaryColor, secondaryColor, logo, favicon } = theme;
    const cleanTheme: any = { primaryColor, secondaryColor };
    if (logo) cleanTheme.logo = logo;
    if (favicon) cleanTheme.favicon = favicon;
    const result = await onUpdate({ theme: cleanTheme });
    if (result.success) {
      alert('✅ Tema actualizado correctamente');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingLogo(true);
      const data = await fetchApi('/admin/storefront/upload-logo', {
        method: 'POST',
        body: formData,
      });
      setTheme({ ...theme, logo: data.data.logo });
      alert('✅ Logo subido exitosamente');
    } catch (error: any) {
      alert('❌ Error al subir logo: ' + error.message);
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
      const data = await fetchApi('/admin/storefront/upload-favicon', {
        method: 'POST',
        body: formData,
      });
      setTheme({ ...theme, favicon: data.data.favicon });
      alert('✅ Favicon subido exitosamente');
    } catch (error: any) {
      alert('❌ Error al subir favicon: ' + error.message);
    } finally {
      setUploadingFavicon(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Personalización Visual</h3>

        {/* Color Primario */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Color Primario
          </label>
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={theme.primaryColor}
              onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
              className="h-10 w-20 rounded cursor-pointer"
            />
            <input
              type="text"
              value={theme.primaryColor}
              onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100"
              placeholder="#3B82F6"
            />
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Color principal de botones y enlaces
          </p>
        </div>

        {/* Color Secundario */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Color Secundario
          </label>
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={theme.secondaryColor}
              onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
              className="h-10 w-20 rounded cursor-pointer"
            />
            <input
              type="text"
              value={theme.secondaryColor}
              onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100"
              placeholder="#10B981"
            />
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Color secundario para acentos
          </p>
        </div>

        {/* Logo */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Logo
          </label>
          <div className="flex items-start gap-4">
            {theme.logo && (
              <div className="relative">
                <img src={theme.logo} alt="Logo preview" className="h-20 w-auto max-w-[200px] object-contain border-2 border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-800" />
              </div>
            )}
            <div className="flex-1">
              <input
                id="logo-upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => document.getElementById('logo-upload')?.click()}
                disabled={uploadingLogo}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadingLogo ? 'Subiendo...' : theme.logo ? 'Cambiar Logo' : 'Subir Logo'}
              </button>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p><strong>Formato:</strong> PNG o SVG recomendado</p>
                <p><strong>Tamaño máximo:</strong> 2MB</p>
                <p><strong>Dimensiones:</strong> Se optimizará a máximo 400px de ancho</p>
              </div>
            </div>
          </div>
        </div>

        {/* Favicon */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Favicon
          </label>
          <div className="flex items-start gap-4">
            {theme.favicon && (
              <div className="relative">
                <img src={theme.favicon} alt="Favicon preview" className="h-16 w-16 object-contain border-2 border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-800" />
              </div>
            )}
            <div className="flex-1">
              <input
                id="favicon-upload"
                type="file"
                accept="image/x-icon,image/png,image/vnd.microsoft.icon"
                onChange={handleFaviconUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => document.getElementById('favicon-upload')?.click()}
                disabled={uploadingFavicon}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadingFavicon ? 'Subiendo...' : theme.favicon ? 'Cambiar Favicon' : 'Subir Favicon'}
              </button>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p><strong>Formato:</strong> ICO o PNG recomendado</p>
                <p><strong>Tamaño máximo:</strong> 500KB</p>
                <p><strong>Dimensiones:</strong> Se optimizará a 32x32px</p>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-gray-100 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 p-6 rounded-lg transition-colors">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Vista Previa</h4>
          <div className="space-y-3">
            <button
              style={{ backgroundColor: theme.primaryColor }}
              className="px-4 py-2 text-white rounded-md"
            >
              Botón Primario
            </button>
            <button
              style={{ backgroundColor: theme.secondaryColor }}
              className="px-4 py-2 text-white rounded-md ml-3"
            >
              Botón Secundario
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Guardando...' : '💾 Guardar Cambios'}
      </button>
    </div>
  );
}
