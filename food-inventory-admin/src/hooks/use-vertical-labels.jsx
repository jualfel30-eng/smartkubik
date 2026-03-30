import { useMemo } from 'react';
import { useAuth } from './use-auth';
import { VERTICAL_LABELS } from '../config/verticalLabels';

/**
 * Hook para obtener labels adaptativos según el perfil de nicho del tenant.
 *
 * Retorna un objeto con labels de UI que varían por tipo de negocio:
 * - barbershop-salon: "Estación", "Cliente", "Agenda"
 * - mechanic-shop: "Bahía", "Cliente", "Cita de Servicio"
 * - clinic-spa: "Consultorio", "Paciente", "Consulta"
 * - hospitality: "Habitación", "Huésped", "Reservación"
 *
 * @returns {Object} Labels adaptativos (recurso, cliente, cita, checkIn, etc.)
 *
 * @example
 * const labels = useVerticalLabels();
 * <h1>{labels.appointmentsDescription}</h1>
 * <Button>Bloque {labels.recurso.singularLower}</Button>
 * <span>{labels.cliente.singular}: {name}</span>
 */
export function useVerticalLabels() {
  const { tenant } = useAuth();
  const profileKey = tenant?.verticalProfile?.key || 'hospitality';

  return useMemo(
    () => VERTICAL_LABELS[profileKey] || VERTICAL_LABELS.hospitality,
    [profileKey]
  );
}
