import { useState } from 'react';
import { StorefrontConfig } from './hooks/useStorefrontConfig';

interface GoogleBusinessEditorProps {
  config: StorefrontConfig;
  onUpdate: (data: Partial<StorefrontConfig>) => Promise<any>;
  saving: boolean;
}

export function GoogleBusinessEditor({ config, onUpdate, saving }: GoogleBusinessEditorProps) {
  const [placeId, setPlaceId] = useState(config.googlePlaceId || '');
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setSuccess(false);
    const result = await onUpdate({ googlePlaceId: placeId.trim() || undefined });
    if (result?.success !== false) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const googleMapsUrl = placeId
    ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
    : null;

  const reviewUrl = placeId
    ? `https://search.google.com/local/writereview?placeid=${placeId}`
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
          Google Business
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Conecta tu perfil de Google Business para mostrar tu ubicación en mapa y las reseñas reales de Google en tu sitio web.
        </p>

        {/* Place ID input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Google Place ID
          </label>
          <input
            type="text"
            value={placeId}
            onChange={(e) => setPlaceId(e.target.value)}
            placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100 font-mono text-sm transition-colors"
          />
        </div>

        {/* How to find Place ID */}
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ¿Cómo encontrar tu Place ID?
          </h4>
          <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
            <li>Ve a <strong>Google Maps</strong> y busca tu negocio</li>
            <li>Haz clic en tu negocio para abrir el panel lateral</li>
            <li>Copia la URL del navegador — tendrá algo como <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs">place_id:ChIJ...</code></li>
            <li>Alternativamente, usa la herramienta oficial:{' '}
              <a
                href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                Place ID Finder
              </a>
            </li>
          </ol>
        </div>

        {/* Preview links when ID is set */}
        {placeId && (
          <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-3">
              ✅ Place ID configurado — Vista previa de URLs
            </h4>
            <div className="space-y-2">
              {googleMapsUrl && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-700 dark:text-green-400 w-24 flex-shrink-0">Mapa:</span>
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 underline truncate"
                  >
                    {googleMapsUrl}
                  </a>
                </div>
              )}
              {reviewUrl && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-700 dark:text-green-400 w-24 flex-shrink-0">Reseñas:</span>
                  <a
                    href={reviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 underline truncate"
                  >
                    {reviewUrl}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* What it enables */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            {
              icon: '🗺️',
              title: 'Mapa interactivo',
              desc: 'Se muestra en la sección "Encuéntranos" del storefront',
            },
            {
              icon: '⭐',
              title: 'Reseñas reales',
              desc: 'Las 5 mejores reseñas de Google, actualizadas cada 24h',
            },
            {
              icon: '✍️',
              title: 'Botón de reseña',
              desc: 'Tus clientes pueden dejar una reseña con un clic',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center"
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{item.title}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</div>
            </div>
          ))}
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          {success && (
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">
              ✅ Guardado correctamente
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
