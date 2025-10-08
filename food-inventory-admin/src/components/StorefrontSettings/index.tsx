import { useState } from 'react';
import { useStorefrontConfig } from './hooks/useStorefrontConfig';
import { ThemeEditor } from './ThemeEditor';
import { SEOEditor } from './SEOEditor';
import { DomainSettings } from './DomainSettings';
import { SocialMediaEditor } from './SocialMediaEditor';
import { ContactInfoEditor } from './ContactInfoEditor';
import { PreviewModal } from './PreviewModal';

type TabType = 'theme' | 'seo' | 'domain' | 'social' | 'contact';

export default function StorefrontSettings() {
  const { config, loading, error, saving, updateConfig, createConfig, resetConfig, deleteConfig } = useStorefrontConfig();
  const [activeTab, setActiveTab] = useState<TabType>('theme');
  const [showPreview, setShowPreview] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Si no existe config, mostrar formulario de creación inicial
  if (!config) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg shadow transition-colors">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Crear Storefront</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Aún no has configurado tu tienda online. Ingresa un dominio para comenzar:
        </p>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const domain = formData.get('domain') as string;

          const result = await createConfig({ 
            domain,
            isActive: false,
            templateType: 'modern-ecommerce',
            theme: {
              primaryColor: '#3B82F6',
              secondaryColor: '#10B981'
            },
            seo: {
              title: 'Mi Tienda Online',
              description: 'Descripción de mi tienda',
              keywords: []
            },
            socialMedia: {},
            contactInfo: {
              email: 'contacto@mitienda.com',
              phone: '+1234567890'
            }
          });
          if (result.success) {
            // Config creada, el hook actualizará automáticamente
          }
        }}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Dominio de tu tienda
            </label>
            <input
              type="text"
              name="domain"
              placeholder="mi-tienda"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100 transition-colors"
              required
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Ejemplo: "mi-tienda" será accesible en localhost:3001/mi-tienda
            </p>
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 rounded">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Creando...' : 'Crear Storefront'}
          </button>
        </form>
      </div>
    );
  }

  // Tabs de navegación
  const tabs = [
    { id: 'theme' as TabType, label: '🎨 Tema', icon: '🎨' },
    { id: 'seo' as TabType, label: '📝 SEO', icon: '📝' },
    { id: 'domain' as TabType, label: '🔗 Dominio', icon: '🔗' },
    { id: 'social' as TabType, label: '📱 Redes Sociales', icon: '📱' },
    { id: 'contact' as TabType, label: '📞 Contacto', icon: '📞' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg shadow p-6 mb-6 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Configuración del Storefront
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Dominio: <span className="font-medium">{config.domain}</span> •
                Estado: <span className={`font-medium ${config.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {config.isActive ? '🟢 Activo' : '🔴 Inactivo'}
                </span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPreview(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                👁️ Previsualizar
              </button>
              <button
                onClick={async () => {
                  if (confirm('¿Resetear a valores por defecto? Esto no se puede deshacer.')) {
                    await resetConfig();
                  }
                }}
                disabled={saving}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                🔄 Resetear
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg shadow mb-6 transition-colors">
          <div className="border-b border-gray-200 dark:border-gray-800">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 rounded">
                {error}
              </div>
            )}

            {activeTab === 'theme' && (
              <ThemeEditor config={config} onUpdate={updateConfig} saving={saving} />
            )}
            {activeTab === 'seo' && (
              <SEOEditor config={config} onUpdate={updateConfig} saving={saving} />
            )}
            {activeTab === 'domain' && (
              <DomainSettings config={config} onUpdate={updateConfig} saving={saving} onDelete={deleteConfig} />
            )}
            {activeTab === 'social' && (
              <SocialMediaEditor config={config} onUpdate={updateConfig} saving={saving} />
            )}
            {activeTab === 'contact' && (
              <ContactInfoEditor config={config} onUpdate={updateConfig} saving={saving} />
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <PreviewModal
          domain={config.domain}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
