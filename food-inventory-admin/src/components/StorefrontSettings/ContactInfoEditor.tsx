import { useState } from 'react';
import { StorefrontConfig } from './hooks/useStorefrontConfig';

interface ContactInfoEditorProps {
  config: StorefrontConfig;
  onUpdate: (data: Partial<StorefrontConfig>) => Promise<any>;
  saving: boolean;
}

export function ContactInfoEditor({ config, onUpdate, saving }: ContactInfoEditorProps) {
  const [contactInfo, setContactInfo] = useState(config.contactInfo);

  const handleSave = async () => {
    const result = await onUpdate({ contactInfo });
    if (result.success) {
      alert('✅ Información de contacto actualizada correctamente');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Información de Contacto</h3>

        {/* Email */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            📧 Email
          </label>
          <input
            type="email"
            value={contactInfo.email}
            onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100"
            placeholder="contacto@mi-tienda.com"
            required
          />
        </div>

        {/* Teléfono */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            📞 Teléfono
          </label>
          <input
            type="tel"
            value={contactInfo.phone}
            onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100"
            placeholder="+1234567890"
            required
          />
        </div>

        {/* Dirección */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-4">
            📍 Dirección (Opcional)
          </label>

          <div className="space-y-3">
            <input
              type="text"
              value={contactInfo.address?.street || ''}
              onChange={(e) => setContactInfo({
                ...contactInfo,
                address: { ...contactInfo.address, street: e.target.value } as any
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100"
              placeholder="Calle y número"
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={contactInfo.address?.city || ''}
                onChange={(e) => setContactInfo({
                  ...contactInfo,
                  address: { ...contactInfo.address, city: e.target.value } as any
                })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100"
                placeholder="Ciudad"
              />
              <input
                type="text"
                value={contactInfo.address?.state || ''}
                onChange={(e) => setContactInfo({
                  ...contactInfo,
                  address: { ...contactInfo.address, state: e.target.value } as any
                })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100"
                placeholder="Estado/Provincia"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={contactInfo.address?.country || ''}
                onChange={(e) => setContactInfo({
                  ...contactInfo,
                  address: { ...contactInfo.address, country: e.target.value } as any
                })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100"
                placeholder="País"
              />
              <input
                type="text"
                value={contactInfo.address?.postalCode || ''}
                onChange={(e) => setContactInfo({
                  ...contactInfo,
                  address: { ...contactInfo.address, postalCode: e.target.value } as any
                })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-gray-100"
                placeholder="Código Postal"
              />
            </div>
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
