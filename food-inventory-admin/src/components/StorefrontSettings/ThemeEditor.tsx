import { useState } from 'react';
import { StorefrontConfig } from './hooks/useStorefrontConfig';

interface ThemeEditorProps {
  config: StorefrontConfig;
  onUpdate: (data: Partial<StorefrontConfig>) => Promise<any>;
  saving: boolean;
}

export function ThemeEditor({ config, onUpdate, saving }: ThemeEditorProps) {
  const [theme, setTheme] = useState(config.theme);

  const handleSave = async () => {
    const result = await onUpdate({ theme });
    if (result.success) {
      alert('✅ Tema actualizado correctamente');
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
            Logo (URL)
          </label>
          <input
            type="url"
            value={theme.logo || ''}
            onChange={(e) => setTheme({ ...theme, logo: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100"
            placeholder="https://example.com/logo.png"
          />
          {theme.logo && (
            <div className="mt-2">
              <img src={theme.logo} alt="Logo preview" className="h-16 object-contain" />
            </div>
          )}
        </div>

        {/* Favicon */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Favicon (URL)
          </label>
          <input
            type="url"
            value={theme.favicon || ''}
            onChange={(e) => setTheme({ ...theme, favicon: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100"
            placeholder="https://example.com/favicon.ico"
          />
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
