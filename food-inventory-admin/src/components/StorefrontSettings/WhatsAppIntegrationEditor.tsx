import { useState } from 'react';
import type { StorefrontConfig } from './hooks/useStorefrontConfig';

interface WhatsAppIntegrationEditorProps {
  config: StorefrontConfig;
  onUpdate: (data: Partial<StorefrontConfig>) => Promise<any>;
  saving: boolean;
}

export function WhatsAppIntegrationEditor({ config, onUpdate, saving }: WhatsAppIntegrationEditorProps) {
  const [formData, setFormData] = useState({
    enabled: config.whatsappIntegration?.enabled ?? false,
    businessPhone: config.whatsappIntegration?.businessPhone ?? '',
    welcomeMessage: config.whatsappIntegration?.welcomeMessage ?? '¡Hola! Gracias por tu interés en nuestros productos. ¿En qué puedo ayudarte?',
    buttonText: config.whatsappIntegration?.buttonText ?? '💬 Contactar por WhatsApp',
    autoSendOrderConfirmation: config.whatsappIntegration?.autoSendOrderConfirmation ?? true,
    sendPaymentInstructions: config.whatsappIntegration?.sendPaymentInstructions ?? true,
    includeStoreLink: config.whatsappIntegration?.includeStoreLink ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate({
      whatsappIntegration: formData,
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Activación */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Activar Integración de WhatsApp
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Permite que los clientes contacten y reciban confirmaciones por WhatsApp
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => handleChange('enabled', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {formData.enabled && (
        <>
          {/* Teléfono del Negocio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Teléfono de WhatsApp Business *
            </label>
            <input
              type="tel"
              value={formData.businessPhone}
              onChange={(e) => handleChange('businessPhone', e.target.value)}
              placeholder="+58 412 1234567"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100"
              required
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Número de WhatsApp donde los clientes podrán contactarte (incluye código de país)
            </p>
          </div>

          {/* Texto del Botón */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Texto del Botón de WhatsApp
            </label>
            <input
              type="text"
              value={formData.buttonText}
              onChange={(e) => handleChange('buttonText', e.target.value)}
              placeholder="💬 Contactar por WhatsApp"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100"
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Texto que aparecerá en el botón de contacto de WhatsApp
            </p>
          </div>

          {/* Mensaje de Bienvenida */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Mensaje de Bienvenida
            </label>
            <textarea
              value={formData.welcomeMessage}
              onChange={(e) => handleChange('welcomeMessage', e.target.value)}
              rows={3}
              placeholder="¡Hola! Gracias por tu interés..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100"
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Mensaje pre-escrito que aparecerá cuando el cliente abra WhatsApp
            </p>
          </div>

          {/* Opciones de Automatización */}
          <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              Automatización de Mensajes
            </h4>

            <label className="flex items-start">
              <input
                type="checkbox"
                checked={formData.autoSendOrderConfirmation}
                onChange={(e) => handleChange('autoSendOrderConfirmation', e.target.checked)}
                className="mt-1 mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Enviar confirmación automática de pedido
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  El cliente recibirá un mensaje de WhatsApp automáticamente cuando complete su pedido
                </p>
              </div>
            </label>

            <label className="flex items-start">
              <input
                type="checkbox"
                checked={formData.sendPaymentInstructions}
                onChange={(e) => handleChange('sendPaymentInstructions', e.target.checked)}
                className="mt-1 mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Incluir instrucciones de pago
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enviar datos bancarios, monto exacto a pagar y referencia del pedido
                </p>
              </div>
            </label>

            <label className="flex items-start">
              <input
                type="checkbox"
                checked={formData.includeStoreLink}
                onChange={(e) => handleChange('includeStoreLink', e.target.checked)}
                className="mt-1 mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Incluir enlace a la tienda
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Agregar el enlace de tu storefront en los mensajes de WhatsApp
                </p>
              </div>
            </label>
          </div>

          {/* Vista Previa del Mensaje */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Vista Previa del Mensaje
            </h4>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {formData.welcomeMessage}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Este es el mensaje que verán tus clientes al hacer clic en el botón de WhatsApp
            </p>
          </div>
        </>
      )}

      {/* Botón de Guardar */}
      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          disabled={saving || (formData.enabled && !formData.businessPhone)}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </div>
    </form>
  );
}
