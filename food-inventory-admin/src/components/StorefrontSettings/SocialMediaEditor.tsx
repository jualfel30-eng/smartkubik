import { useState } from 'react';
import { StorefrontConfig } from './hooks/useStorefrontConfig';

interface SocialMediaEditorProps {
  config: StorefrontConfig;
  onUpdate: (data: Partial<StorefrontConfig>) => Promise<any>;
  saving: boolean;
}

export function SocialMediaEditor({ config, onUpdate, saving }: SocialMediaEditorProps) {
  const [socialMedia, setSocialMedia] = useState(config.socialMedia);

  const handleSave = async () => {
    // Limpiar strings vacíos → undefined para que @IsOptional() los ignore en el backend
    const cleaned: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(socialMedia)) {
      cleaned[key] = value?.trim() || undefined;
    }
    const result = await onUpdate({ socialMedia: cleaned as any });
    if (result.success) {
      alert('✅ Redes sociales actualizadas correctamente');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Redes Sociales</h3>

        {/* Facebook */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            📘 Facebook
          </label>
          <input
            type="url"
            value={socialMedia.facebook || ''}
            onChange={(e) => setSocialMedia({ ...socialMedia, facebook: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100"
            placeholder="https://facebook.com/mi-tienda"
          />
        </div>

        {/* Instagram */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            📷 Instagram
          </label>
          <input
            type="url"
            value={socialMedia.instagram || ''}
            onChange={(e) => setSocialMedia({ ...socialMedia, instagram: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100"
            placeholder="https://instagram.com/mi-tienda"
          />
        </div>

        {/* WhatsApp */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            💬 WhatsApp
          </label>
          <input
            type="tel"
            value={socialMedia.whatsapp || ''}
            onChange={(e) => setSocialMedia({ ...socialMedia, whatsapp: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100"
            placeholder="+1234567890"
          />
        </div>

        {/* Twitter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            🐦 Twitter/X
          </label>
          <input
            type="url"
            value={socialMedia.twitter || ''}
            onChange={(e) => setSocialMedia({ ...socialMedia, twitter: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100"
            placeholder="https://twitter.com/mi-tienda"
          />
        </div>

        {/* LinkedIn */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            💼 LinkedIn
          </label>
          <input
            type="url"
            value={socialMedia.linkedin || ''}
            onChange={(e) => setSocialMedia({ ...socialMedia, linkedin: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100"
            placeholder="https://linkedin.com/company/mi-tienda"
          />
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
