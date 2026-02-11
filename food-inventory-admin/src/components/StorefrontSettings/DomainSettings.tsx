import { useState, useEffect, useRef } from 'react';
import { StorefrontConfig } from './hooks/useStorefrontConfig';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { fetchApi } from '../../lib/api';

interface DomainSettingsProps {
  config: StorefrontConfig;
  onUpdate: (data: Partial<StorefrontConfig>) => Promise<any>;
  onDelete: () => Promise<any>;
  saving: boolean;
}

export function DomainSettings({ config, onUpdate, onDelete, saving }: DomainSettingsProps) {
  const [domain, setDomain] = useState(config.domain);
  const [isActive, setIsActive] = useState(config.isActive);
  const [templateType, setTemplateType] = useState(config.templateType);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [domainAvailable, setDomainAvailable] = useState<boolean | null>(null);
  const [suggestedDomain, setSuggestedDomain] = useState<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Check domain availability with debounce
  useEffect(() => {
    if (!domain || domain === config.domain) {
      setDomainAvailable(null);
      return;
    }

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(async () => {
      setCheckingDomain(true);
      try {
        const data = await fetchApi(`/admin/storefront/check-domain?domain=${encodeURIComponent(domain)}`);
        setDomainAvailable(data.isAvailable);
      } catch (error) {
        console.error('Error checking domain:', error);
        setDomainAvailable(null);
      } finally {
        setCheckingDomain(false);
      }
    }, 500); // 500ms debounce

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [domain, config.domain]);

  // Load suggested domain from config if available
  useEffect(() => {
    if (config.suggestedDomain) {
      setSuggestedDomain(config.suggestedDomain);
    }
  }, [config.suggestedDomain]);

  const handleSave = async () => {
    if (domainAvailable === false) {
      alert('❌ El dominio no está disponible. Por favor elige otro.');
      return;
    }

    const result = await onUpdate({ domain, isActive, templateType });
    if (result.success) {
      alert('✅ Configuración actualizada correctamente');
    }
  };

  const handleDelete = async () => {
    if (confirm('⚠️ ¿Estás seguro de eliminar el storefront? Esta acción no se puede deshacer.')) {
      const result = await onDelete();
      if (result.success) {
        alert('✅ Storefront eliminado correctamente');
      }
    }
  };

  const useSuggestedDomain = () => {
    if (suggestedDomain) {
      setDomain(suggestedDomain);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Configuración General</h3>

        {/* Dominio */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Dominio del Storefront
          </label>
          <div className="relative">
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100"
              placeholder="mi-tienda"
            />
            {domain && domain !== config.domain && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checkingDomain ? (
                  <Loader className="h-5 w-5 text-gray-400 animate-spin" />
                ) : domainAvailable === true ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : domainAvailable === false ? (
                  <XCircle className="h-5 w-5 text-red-500" />
                ) : null}
              </div>
            )}
          </div>

          {/* Domain status message */}
          {domain && domain !== config.domain && !checkingDomain && domainAvailable !== null && (
            <p className={`mt-1 text-sm ${domainAvailable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {domainAvailable
                ? '✓ Dominio disponible'
                : '✗ Dominio no disponible, ya está en uso'}
            </p>
          )}

          {/* Suggested domain */}
          {suggestedDomain && domain !== suggestedDomain && (
            <div className="mt-2 flex items-center gap-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Dominio sugerido: <span className="font-medium">{suggestedDomain}</span>
              </p>
              <button
                type="button"
                onClick={useSuggestedDomain}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Usar este dominio
              </button>
            </div>
          )}

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            URL: <span className="font-medium">localhost:3001/{domain}</span>
          </p>
        </div>

        {/* Template Type */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Tipo de Template
          </label>
          <select
            value={templateType}
            onChange={(e) => setTemplateType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="ecommerce">E-commerce</option>
            <option value="services">Servicios</option>
            <option value="premium">Premium (Maximalist)</option>
          </select>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Elige el tipo de plantilla según tu modelo de negocio
          </p>
        </div>

        {/* Estado Activo/Inactivo */}
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-700 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              Storefront Activo
            </span>
          </label>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isActive
              ? '🟢 El storefront está visible públicamente'
              : '🔴 El storefront no es accesible públicamente'}
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-md p-4 transition-colors">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">ℹ️ Información</h4>
          <ul className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
            <li>• Los cambios de dominio pueden tardar hasta 60 segundos en propagarse (ISR)</li>
            <li>• Solo puede haber un storefront activo por tenant</li>
            <li>• El dominio debe ser único en todo el sistema</li>
          </ul>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : '💾 Guardar Cambios'}
        </button>
        <button
          onClick={handleDelete}
          disabled={saving}
          className="px-6 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          🗑️ Eliminar
        </button>
      </div>
    </div>
  );
}
