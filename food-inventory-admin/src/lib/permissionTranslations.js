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
};

export const translatePermission = (permission, type = 'permission') => {
  if (type === 'group') {
    return permissionGroupTranslations[permission] || permission;
  }
  return permissionTranslations[permission] || permission;
};
