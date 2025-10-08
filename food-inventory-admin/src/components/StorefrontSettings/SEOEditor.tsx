import { useState } from 'react';
import { StorefrontConfig } from './hooks/useStorefrontConfig';

interface SEOEditorProps {
  config: StorefrontConfig;
  onUpdate: (data: Partial<StorefrontConfig>) => Promise<any>;
  saving: boolean;
}

export function SEOEditor({ config, onUpdate, saving }: SEOEditorProps) {
  const [seo, setSeo] = useState(config.seo);
  const [keywordInput, setKeywordInput] = useState('');

  const handleSave = async () => {
    const result = await onUpdate({ seo });
    if (result.success) {
      alert('✅ SEO actualizado correctamente');
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !seo.keywords.includes(keywordInput.trim())) {
      setSeo({ ...seo, keywords: [...seo.keywords, keywordInput.trim()] });
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setSeo({ ...seo, keywords: seo.keywords.filter(k => k !== keyword) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Optimización SEO</h3>

        {/* Título */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Título de la Página (max 60 caracteres)
          </label>
          <input
            type="text"
            value={seo.title}
            onChange={(e) => setSeo({ ...seo, title: e.target.value })}
            maxLength={60}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {seo.title.length}/60 caracteres
          </p>
        </div>

        {/* Descripción */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Descripción (max 160 caracteres)
          </label>
          <textarea
            value={seo.description}
            onChange={(e) => setSeo({ ...seo, description: e.target.value })}
            maxLength={160}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {seo.description.length}/160 caracteres
          </p>
        </div>

        {/* Keywords */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Palabras Clave
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100"
              placeholder="Escribe una palabra clave y presiona Enter"
            />
            <button
              onClick={addKeyword}
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Agregar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {seo.keywords.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 rounded-full text-sm"
              >
                {keyword}
                <button
                  onClick={() => removeKeyword(keyword)}
                  className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-gray-100 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 p-6 rounded-lg transition-colors">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Vista Previa en Google</h4>
          <div className="bg-white dark:bg-gray-950 p-4 rounded border border-gray-200 dark:border-gray-800">
            <div className="text-blue-600 dark:text-blue-400 text-xl">{seo.title}</div>
            <div className="text-green-700 dark:text-green-400 text-sm mt-1">
              https://storefront.com/{config.domain}
            </div>
            <div className="text-gray-600 dark:text-gray-300 text-sm mt-2">{seo.description}</div>
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
