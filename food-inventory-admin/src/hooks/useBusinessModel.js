import { useAuth } from './use-auth';

/**
 * Mapeo de businessType a modelo de pricing
 *
 * resource_centric: El recurso define el precio (hoteles, alquiler)
 * service_centric: El servicio define el precio (spa, clínicas)
 * flexible: Permite ambos modelos (vertical HYBRID)
 */
const BUSINESS_TYPE_PRICING_MODEL = {
  // Resource-centric: El cliente reserva el recurso específico
  'Hotel': 'resource_centric',
  'Posada': 'resource_centric',
  'Hostal': 'resource_centric',
  'Apart-hotel': 'resource_centric',
  'Resort': 'resource_centric',

  // Service-centric: El cliente reserva el servicio, sistema asigna recurso
  'Spa': 'service_centric',
  'Clínica': 'service_centric',
  'Hospital': 'service_centric',
  'Consultorio médico': 'service_centric',
  'Centro de estética': 'service_centric',
  'Gimnasio': 'service_centric',
  'Escuela': 'service_centric',
  'Academia': 'service_centric',
  'Centro de formación': 'service_centric',
  'Taller mecánico': 'service_centric',
  'Taller de reparación': 'service_centric',
  'Peluquería': 'service_centric',
  'Barbería': 'service_centric',
  'Salón de belleza': 'service_centric',

  // Mixed/Flexible (HYBRID vertical permite ambos)
  'Hotel con Restaurante': 'flexible',
  'Hotel con Spa': 'flexible',
  'Restaurante con Hotel': 'flexible',
  'Centro deportivo': 'flexible',
};

/**
 * Hook para obtener el modelo de negocio/pricing del tenant actual
 *
 * @returns {Object} Información del modelo de negocio
 * @property {string} model - 'resource_centric' | 'service_centric' | 'flexible'
 * @property {boolean} isResourceCentric - true si recursos definen el precio
 * @property {boolean} isServiceCentric - true si servicios definen el precio
 * @property {boolean} isFlexible - true si soporta ambos modelos (HYBRID)
 * @property {string} businessType - Tipo de negocio del tenant
 * @property {string} vertical - Vertical del tenant
 *
 * @example
 * const { isResourceCentric, businessType } = useBusinessModel();
 *
 * if (isResourceCentric) {
 *   return <PriceInResourceForm />;
 * } else {
 *   return <PriceInServiceForm />;
 * }
 */
export function useBusinessModel() {
  const { tenant } = useAuth();

  if (!tenant) {
    // Default to service-centric if no tenant (shouldn't happen in normal flow)
    return {
      model: 'service_centric',
      isResourceCentric: false,
      isServiceCentric: true,
      isFlexible: false,
      businessType: null,
      vertical: null,
    };
  }

  // HYBRID vertical siempre es flexible (soporta ambos modelos)
  if (tenant.vertical === 'HYBRID') {
    return {
      model: 'flexible',
      isResourceCentric: false,
      isServiceCentric: false,
      isFlexible: true,
      businessType: tenant.businessType,
      vertical: tenant.vertical,
    };
  }

  // Determinar modelo según businessType
  const model = BUSINESS_TYPE_PRICING_MODEL[tenant.businessType] || 'service_centric';

  return {
    model,
    isResourceCentric: model === 'resource_centric',
    isServiceCentric: model === 'service_centric',
    isFlexible: model === 'flexible',
    businessType: tenant.businessType,
    vertical: tenant.vertical,
  };
}

/**
 * Helper para obtener texto contextual según el businessType
 */
export function getBusinessContextText(businessType, context = 'resource') {
  const resourceCentricTypes = ['Hotel', 'Posada', 'Hostal', 'Apart-hotel', 'Resort'];
  const isResourceCentric = resourceCentricTypes.includes(businessType);

  if (context === 'resource' && isResourceCentric) {
    return {
      title: 'Precio al cliente',
      description: `En tu tipo de negocio (${businessType}), el precio lo define cada recurso individual que el cliente reserva.`,
      example: 'Ej: Habitación 101 - $150/noche',
    };
  }

  if (context === 'resource' && !isResourceCentric) {
    return {
      title: 'Costo operativo (opcional)',
      description: 'Costo interno de este recurso para calcular rentabilidad (salario, comisión, etc.)',
      example: 'Ej: $15/hora de nómina',
    };
  }

  if (context === 'service' && isResourceCentric) {
    return {
      title: 'Precio referencial',
      description: `En tu tipo de negocio (${businessType}), el precio real lo define cada recurso. Este precio es solo referencial.`,
      example: 'Ej: "Desde $100/noche"',
    };
  }

  return {
    title: 'Precio del servicio',
    description: 'Este es el precio que el cliente pagará por este servicio.',
    example: 'Ej: Masaje 60min - $50',
  };
}
