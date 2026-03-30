/**
 * Labels adaptativos por perfil de nicho (vertical profile key).
 *
 * Centraliza toda la terminología UI que varía según el tipo de negocio.
 * Usado por el hook `useVerticalLabels()` para adaptar textos en componentes.
 */

export const VERTICAL_LABELS = {
  'barbershop-salon': {
    // Recursos (estaciones, sillas)
    recurso: {
      singular: 'Estación',
      plural: 'Estaciones',
      singularLower: 'estación',
      pluralLower: 'estaciones',
    },
    // Cliente
    cliente: {
      singular: 'Cliente',
      plural: 'Clientes',
      singularLower: 'cliente',
      pluralLower: 'clientes',
    },
    // Citas/Agenda
    cita: {
      singular: 'Agenda',
      plural: 'Agenda',
      singularLower: 'agenda',
    },
    // Acciones
    checkIn: 'Iniciar Servicio',
    checkOut: 'Finalizar',
    nextCheckIn: 'Próxima Cita',
    // Descripciones
    appointmentsDescription: 'Gestiona la agenda de tu barbería o salón',
    blockTitle: 'Bloqueo de Estación',
    blockDescription: 'Registra un bloqueo temporal por mantenimiento o limpieza',
    blockGroupTitle: 'Bloque Grupal',
    resourceReady: 'Estación lista para el próximo cliente.',
    // Placeholders
    selectResource: 'Selecciona una estación',
    selectResourceValid: 'Selecciona una estación válida.',
    searchPlaceholder: 'Buscar por nombre, barbero, cliente...',
    // Forms
    customerNameLabel: 'Nombre del Cliente',
    customerNamePlaceholder: 'Ingresa el nombre del cliente.',
    // Errors
    customerNameRequired: 'Ingresa el nombre del cliente.',
    newCustomerError: 'No pudimos registrar al nuevo cliente.',
    // Otros
    noCustomerAssigned: 'Sin cliente asignado',
    customerLabel: 'Cliente',
    professionalLabel: 'Barbero/Estilista',
  },

  'mechanic-shop': {
    recurso: {
      singular: 'Bahía',
      plural: 'Bahías / Equipos',
      singularLower: 'bahía',
      pluralLower: 'bahías',
    },
    cliente: {
      singular: 'Cliente',
      plural: 'Clientes',
      singularLower: 'cliente',
      pluralLower: 'clientes',
    },
    cita: {
      singular: 'Cita de Servicio',
      plural: 'Citas de Servicio',
      singularLower: 'cita de servicio',
    },
    checkIn: 'Iniciar Trabajo',
    checkOut: 'Completar Servicio',
    nextCheckIn: 'Próxima Cita',
    appointmentsDescription: 'Gestiona las citas de servicio del taller',
    blockTitle: 'Bloqueo de Bahía',
    blockDescription: 'Registra un bloqueo temporal por mantenimiento de equipos',
    blockGroupTitle: 'Bloque Grupal',
    resourceReady: 'Bahía lista para el próximo servicio.',
    selectResource: 'Selecciona una bahía',
    selectResourceValid: 'Selecciona una bahía válida.',
    searchPlaceholder: 'Buscar por nombre, vehículo, placa...',
    customerNameLabel: 'Nombre del Cliente',
    customerNamePlaceholder: 'Ingresa el nombre del cliente.',
    customerNameRequired: 'Ingresa el nombre del cliente.',
    newCustomerError: 'No pudimos registrar al nuevo cliente.',
    noCustomerAssigned: 'Sin cliente asignado',
    customerLabel: 'Cliente',
    professionalLabel: 'Mecánico',
  },

  'clinic-spa': {
    recurso: {
      singular: 'Consultorio',
      plural: 'Consultorios',
      singularLower: 'consultorio',
      pluralLower: 'consultorios',
    },
    cliente: {
      singular: 'Paciente',
      plural: 'Pacientes',
      singularLower: 'paciente',
      pluralLower: 'pacientes',
    },
    cita: {
      singular: 'Consulta',
      plural: 'Consultas',
      singularLower: 'consulta',
    },
    checkIn: 'Iniciar Consulta',
    checkOut: 'Finalizar Consulta',
    nextCheckIn: 'Próxima Consulta',
    appointmentsDescription: 'Gestiona las consultas y tratamientos',
    blockTitle: 'Bloqueo de Consultorio',
    blockDescription: 'Registra un bloqueo temporal por sanitización o mantenimiento',
    blockGroupTitle: 'Bloque Grupal',
    resourceReady: 'Consultorio listo para el próximo paciente.',
    selectResource: 'Selecciona un consultorio',
    selectResourceValid: 'Selecciona un consultorio válido.',
    searchPlaceholder: 'Buscar por nombre, paciente, tratamiento...',
    customerNameLabel: 'Nombre del Paciente',
    customerNamePlaceholder: 'Ingresa el nombre del paciente.',
    customerNameRequired: 'Ingresa el nombre del paciente.',
    newCustomerError: 'No pudimos registrar al nuevo paciente.',
    noCustomerAssigned: 'Sin paciente asignado',
    customerLabel: 'Paciente',
    professionalLabel: 'Especialista',
  },

  'hospitality': {
    recurso: {
      singular: 'Habitación',
      plural: 'Habitaciones',
      singularLower: 'habitación',
      pluralLower: 'habitaciones',
    },
    cliente: {
      singular: 'Huésped',
      plural: 'Huéspedes',
      singularLower: 'huésped',
      pluralLower: 'huéspedes',
    },
    cita: {
      singular: 'Reservación',
      plural: 'Reservaciones',
      singularLower: 'reservación',
    },
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    nextCheckIn: 'Próximo check-in',
    appointmentsDescription: 'Gestiona las reservas del hotel y spa',
    blockTitle: 'Bloqueo de Habitación',
    blockDescription: 'Registra un bloqueo temporal por mantenimiento o limpieza profunda',
    blockGroupTitle: 'Bloque Grupal',
    resourceReady: 'Habitación lista para el próximo huésped.',
    selectResource: 'Selecciona una habitación',
    selectResourceValid: 'Selecciona una habitación válida.',
    searchPlaceholder: 'Buscar por nombre, huésped, etiqueta...',
    customerNameLabel: 'Nombre del Huésped',
    customerNamePlaceholder: 'Ingresa el nombre del huésped.',
    customerNameRequired: 'Ingresa el nombre del huésped.',
    newCustomerError: 'No pudimos registrar al nuevo huésped.',
    noCustomerAssigned: 'Sin huésped asignado',
    customerLabel: 'Huésped',
    professionalLabel: 'Recepcionista',
  },
};
