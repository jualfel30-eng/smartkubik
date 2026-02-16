export const permissionGroupTranslations = {
  users: 'Usuarios',
  roles: 'Roles y Permisos',
  customers: 'Clientes',
  dashboard: 'Dashboard',
  events: 'Eventos',
  inventory: 'Inventario',
  orders: 'Pedidos',
  payables: 'Cuentas por Pagar',
  pricing: 'Precios',
  products: 'Productos',
  accounting: 'Contabilidad',
  tenant: 'Empresa',
  cash_register: 'Cierre de Caja',
  billing: 'Facturación',
  appointments: 'Citas/Reservaciones',
  tips: 'Propinas',
  commissions: 'Comisiones',
  production: 'Producción',
  restaurant: 'Restaurante',
  marketing: 'Marketing',
  communication: 'Comunicación',
  opportunities: 'Oportunidades',
  goals: 'Metas',
  bonuses: 'Bonos',
  payroll: 'Nómina',
};

export const permissionTranslations = {
  // Usuarios
  users_create: 'Crear y invitar usuarios',
  users_read: 'Ver lista de usuarios',
  users_update: 'Editar usuarios',
  users_delete: 'Eliminar usuarios',

  // Roles
  roles_create: 'Crear nuevos roles',
  roles_read: 'Ver lista de roles',
  roles_update: 'Editar roles y permisos',
  roles_delete: 'Eliminar roles',

  // Clientes
  customers_create: 'Crear clientes',
  customers_read: 'Ver lista de clientes',
  customers_update: 'Editar clientes',
  customers_delete: 'Eliminar clientes',

  // Dashboard
  dashboard_read: 'Ver el dashboard principal',

  // Eventos
  events_create: 'Crear eventos',
  events_read: 'Ver eventos',
  events_update: 'Editar eventos',
  events_delete: 'Eliminar eventos',

  // Inventario
  inventory_create: 'Crear registros de inventario',
  inventory_read: 'Ver inventario',
  inventory_update: 'Ajustar y mover inventario',

  // Pedidos
  orders_create: 'Crear pedidos',
  orders_read: 'Ver pedidos',
  orders_update: 'Editar y cambiar estado de pedidos',
  orders_apply_discounts: 'Aplicar descuentos a productos y órdenes',

  // Cuentas por Pagar
  payables_create: 'Crear cuentas por pagar',
  payables_read: 'Ver cuentas por pagar',
  payables_update: 'Actualizar cuentas por pagar',
  payables_delete: 'Eliminar cuentas por pagar',

  // Precios
  pricing_calculate: 'Calcular precios',

  // Productos
  products_create: 'Crear productos',
  products_read: 'Ver productos',
  products_update: 'Editar productos',
  products_delete: 'Eliminar productos',

  // Contabilidad
  accounting_read: 'Ver módulos de contabilidad',

  // Empresa
  tenant_settings_read: 'Ver configuración de la empresa',

  // Cierre de Caja
  cash_register_read: 'Ver sesiones y cierres de caja',
  cash_register_open: 'Abrir sesión de caja',
  cash_register_write: 'Registrar movimientos de efectivo',
  cash_register_close: 'Cerrar sesión de caja',
  cash_register_admin: 'Administrar todas las cajas y cierres globales',
  cash_register_approve: 'Aprobar o rechazar cierres de caja',
  cash_register_reports: 'Ver reportes de cierres de caja',
  cash_register_export: 'Exportar cierres (PDF, Excel, CSV)',

  // Facturación
  billing_read: 'Ver facturas y documentos fiscales',
  billing_create: 'Crear facturas y documentos fiscales',
  billing_void: 'Anular facturas y documentos fiscales',

  // Citas/Reservaciones
  appointments_read: 'Ver citas y reservaciones',
  appointments_create: 'Crear citas y reservaciones',
  appointments_update: 'Actualizar citas y reservaciones',
  appointments_delete: 'Eliminar citas y reservaciones',

  // Propinas
  tips_read: 'Ver propinas',
  tips_write: 'Registrar y gestionar propinas',
  tips_distribute: 'Distribuir propinas',

  // Comisiones
  commissions_read: 'Ver planes y registros de comisiones',
  commissions_write: 'Crear y gestionar planes de comisiones',
  commissions_approve: 'Aprobar o rechazar comisiones',

  // Oportunidades (CRM)
  opportunities_read: 'Ver oportunidades',
  opportunities_create: 'Crear oportunidades',
  opportunities_update: 'Actualizar oportunidades',
  opportunities_delete: 'Eliminar oportunidades',
  opportunities_view_all: 'Ver todas las oportunidades del tenant',

  // Metas
  goals_read: 'Ver metas de ventas',
  goals_write: 'Crear y gestionar metas',

  // Bonos
  bonuses_read: 'Ver bonos de empleados',
  bonuses_write: 'Crear y gestionar bonos',
  bonuses_approve: 'Aprobar o rechazar bonos',

  // Nómina
  payroll_employees_read: 'Ver información de nómina',
  payroll_employees_write: 'Gestionar nómina de empleados',

  // Restaurante
  restaurant_read: 'Ver módulo de restaurante',
  restaurant_write: 'Gestionar módulo de restaurante',

  // Chat
  chat_read: 'Ver conversaciones y mensajes',
  chat_write: 'Enviar mensajes y gestionar conversaciones',

  // Marketing
  marketing_read: 'Ver campañas de marketing',
  marketing_write: 'Crear y gestionar campañas',

  // Producción
  production_read: 'Ver módulo de producción',
  production_orders_read: 'Ver órdenes de producción',
  production_orders_create: 'Crear órdenes de producción',
  production_orders_update: 'Actualizar órdenes de producción',
  production_orders_delete: 'Eliminar órdenes de producción',
  production_orders_start: 'Iniciar órdenes de producción',
  production_orders_complete: 'Completar órdenes de producción',
  production_orders_cancel: 'Cancelar órdenes de producción',
  bom_read: 'Ver listas de materiales (BOM)',
  bom_create: 'Crear BOMs',
  bom_update: 'Actualizar BOMs',
  bom_delete: 'Eliminar BOMs',
  routing_read: 'Ver rutas de producción',
  routing_create: 'Crear rutas de producción',
  routing_update: 'Actualizar rutas de producción',
  routing_delete: 'Eliminar rutas de producción',
  work_centers_read: 'Ver centros de trabajo',
  work_centers_create: 'Crear centros de trabajo',
  work_centers_update: 'Actualizar centros de trabajo',
  work_centers_delete: 'Eliminar centros de trabajo',
  mrp_read: 'Ver planificación de materiales (MRP)',
  mrp_run: 'Ejecutar MRP',
  mrp_write: 'Crear/actualizar registros MRP',

  // Reportes
  reports_read: 'Ver reportes',

  // Settings
  settings_read: 'Ver configuración',
  settings_update: 'Actualizar configuración',
  tenant_settings_update: 'Actualizar configuración del tenant',

  // Compras
  purchases_read: 'Ver compras',
  purchases_create: 'Crear compras',
  purchases_update: 'Actualizar compras',
  purchases_delete: 'Eliminar compras',
};

export const translatePermission = (permission, type = 'permission') => {
  if (type === 'group') {
    return permissionGroupTranslations[permission] || permission;
  }
  return permissionTranslations[permission] || permission;
};
