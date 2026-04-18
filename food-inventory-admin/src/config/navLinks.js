import {
  LayoutDashboard,
  MapPin,
  ShoppingCart,
  Boxes,
  Box,
  List,
  Factory,
  Coffee,
  Wrench,
  Calculator,
  Building2,
  RefreshCw,
  AlertCircle,
  AreaChart,
  ArrowRightLeft,
  PackagePlus,
  UserCheck,
  Trash2,
  PackageCheck,
  Truck,
  MessageCircleMore,
  Store,
  Star,
  Utensils,
  ChefHat,
  BookOpen,
  Calendar,
  Target,
  FileText,
  Globe,
  Building,
  UserSquare,
  Briefcase,
  LayoutGrid,
  Mail,
  Megaphone,
  BarChart3,
  Zap,
  TrendingUp,
  ShoppingBag,
  Award,
  Tag,
  Percent,
  Link2,
  Users,
  Filter,
  Receipt,
  TrendingDown,
  Clock,
  CheckCircle2,
  UserCog,
  Layers,
  CalendarDays,
  CircleDollarSign,
  HandCoins,
  CreditCard,
  Upload,
  Sparkles,
  PlusCircle,
  GitBranch,
  BanknoteArrowUp,
  BanknoteArrowDown,
  Settings,
} from 'lucide-react';

/**
 * Returns the full navLinks array for the sidebar/mobile navigation.
 * Extracted from App.jsx so both desktop sidebar and mobile "Más" menu
 * can share the same navigation definition.
 *
 * @param {object} tenant - The current tenant object from useAuth()
 * @returns {Array} navLinks array
 */
export function getNavLinks(tenant) {
  const restaurantModuleEnabled = Boolean(
    tenant?.enabledModules?.restaurant ||
    tenant?.enabledModules?.tables ||
    tenant?.enabledModules?.kitchenDisplay ||
    tenant?.enabledModules?.menuEngineering
  );

  return [
    { name: 'Panel de Control', href: 'dashboard', icon: LayoutDashboard, permission: 'dashboard_read' },
    { name: 'Mis Sedes', href: 'subsidiaries', icon: MapPin, permission: 'dashboard_read', requiresSubsidiaries: true },

    // 1. Módulos Operativos
    {
      name: 'Órdenes',
      href: 'orders',
      icon: ShoppingCart,
      permission: 'orders_read',
      children: [
        { name: 'Nueva Orden', href: 'orders/new', icon: PlusCircle },
        { name: 'Historial', href: 'orders/history', icon: List },
      ]
    },
    {
      name: 'Inventario',
      href: 'inventory-management',
      icon: Boxes,
      permission: 'inventory_read',
      children: [
        {
          name: 'Productos',
          href: 'inventory-management?tab=products',
          icon: Box,
          children: [
            { name: 'Mercancía', href: 'inventory-management?tab=products', icon: Box },
            { name: 'Materias Primas', href: 'inventory-management?tab=raw-materials', icon: Factory },
            { name: 'Consumibles', href: 'inventory-management?tab=consumables', icon: Coffee },
            { name: 'Suministros', href: 'inventory-management?tab=supplies', icon: Wrench },
            { name: 'Motor de Precios', href: 'inventory-management?tab=pricing-engine', icon: Calculator },
          ],
        },
        {
          name: 'Inventario',
          href: 'inventory-management?tab=inventory',
          icon: List,
          children: [
            { name: 'Inventario', href: 'inventory-management?tab=inventory', icon: List },
            { name: 'Almacenes', href: 'inventory-management?tab=inventory-warehouses', icon: Building2 },
            { name: 'Movimientos de Inventario', href: 'inventory-management?tab=inventory-movements', icon: RefreshCw },
            { name: 'Alertas de Stock', href: 'inventory-management?tab=inventory-alerts', icon: AlertCircle },
            { name: 'Reportes', href: 'inventory-management?tab=inventory-reports', icon: AreaChart },
          ],
        },
        { name: 'Traslados', href: 'inventory-management?tab=transfers', icon: ArrowRightLeft, requiresFeatureFlag: 'MULTI_LOCATION' },
        { name: 'Compras', href: 'inventory-management?tab=purchases', icon: PackagePlus },
        { name: 'Proveedores', href: 'inventory-management?tab=suppliers', icon: UserCheck },
        { name: 'Control de Mermas', href: 'waste-control', icon: Trash2, permission: 'inventory_read' },
        { name: 'Sedes', href: 'business-locations', icon: MapPin, permission: 'inventory_read' },
      ]
    },
    { name: 'Entregas', href: 'fulfillment', icon: PackageCheck, permission: 'orders_read', requiresModule: 'fulfillment' },
    { name: 'Portal Repartidores', href: 'driver', icon: Truck, permission: 'orders_read', requiresModule: 'driver' },
    { name: 'WhatsApp', href: 'whatsapp', icon: MessageCircleMore, permission: 'chat_read' },
    { name: 'Compras', href: 'purchases', icon: Truck, permission: 'purchases_read' },
    {
      name: 'Producción',
      href: 'production',
      icon: Factory,
      permission: 'inventory_read',
      requiresModule: 'production',
      requiresVertical: ['MANUFACTURING', 'FOOD_SERVICE'],
      children: [
        { name: 'Dashboard', href: 'production?tab=dashboard', icon: BarChart3 },
        { name: 'Órdenes', href: 'production?tab=orders', icon: Factory },
        { name: 'BOMs', href: 'production?tab=boms', icon: FileText },
        { name: 'Centros de Trabajo', href: 'production?tab=workcenters', icon: Settings },
        { name: 'Rutas', href: 'production?tab=routings', icon: GitBranch },
        { name: 'Versiones', href: 'production?tab=versions', icon: Layers },
      ]
    },
    { name: 'Mi Sitio Web', href: 'storefront', icon: Store, permission: 'dashboard_read', requiresModule: 'ecommerce' },
    { name: 'Reseñas', href: 'reviews', icon: Star, permission: 'appointments_read', requiresVertical: ['SERVICES', 'HOSPITALITY'] },

    // Módulos específicos de Restaurante
    { name: 'Mesas', href: 'restaurant/floor-plan', icon: Utensils, permission: 'restaurant_read', requiresModule: 'restaurant' },
    { name: 'Cocina (KDS)', href: 'restaurant/kitchen-display', icon: ChefHat, permission: 'restaurant_read', requiresModule: 'restaurant' },
    { name: 'Recetas', href: 'restaurant/recipes', icon: BookOpen, permission: 'restaurant_read', requiresModule: 'restaurant' },
    { name: 'Reservas', href: 'restaurant/reservations', icon: Calendar, permission: 'restaurant_read', requiresModule: 'restaurant' },
    { name: 'Ingeniería de Menú', href: 'restaurant/menu-engineering', icon: Target, permission: 'restaurant_read', requiresModule: 'restaurant' },
    { name: 'Órdenes de Compra', href: 'restaurant/purchase-orders', icon: FileText, permission: 'restaurant_read', requiresModule: 'restaurant' },
    { name: 'Menú en Línea', href: 'restaurant/storefront', icon: Globe, permission: 'restaurant_read', requiresModule: 'restaurant' },

    // Módulos específicos de Hotel (solo hospitality profile)
    { name: 'Operaciones Hotel', href: 'hospitality/operations', icon: Building2, permission: 'appointments_read', requiresModule: 'appointments', requiresVertical: ['SERVICES', 'HOSPITALITY'], requiresProfileKey: 'hospitality' },
    { name: 'Plano Hotel', href: 'hospitality/floor-plan', icon: Building, permission: 'appointments_read', requiresModule: 'appointments', requiresVertical: ['SERVICES', 'HOSPITALITY'], requiresProfileKey: 'hospitality' },

    // Módulos de Servicios (todos los perfiles SERVICES)
    { name: 'Recursos', href: 'resources', icon: UserSquare, permission: 'appointments_read', requiresVertical: ['SERVICES', 'HOSPITALITY'], dynamicLabel: true },
    { name: 'Servicios', href: 'services', icon: Briefcase, permission: 'appointments_read', requiresVertical: ['SERVICES', 'HOSPITALITY'] },
    {
      name: 'Citas',
      href: 'appointments',
      icon: Calendar,
      permission: 'appointments_read',
      requiresVertical: ['SERVICES', 'HOSPITALITY'],
      dynamicLabel: true,
      children: [
        { name: 'Lista', href: 'appointments?tab=list', icon: List },
        { name: 'Calendario', href: 'appointments?tab=calendar', icon: Calendar },
      ]
    },
    { name: 'Tablero de Piso', href: 'floor-view', icon: LayoutGrid, permission: 'appointments_read', requiresVertical: ['SERVICES', 'HOSPITALITY'] },

    // 2. Marketing y CRM
    {
      name: 'Marketing',
      href: 'marketing',
      icon: Mail,
      permission: 'marketing_read',
      requiresModule: 'marketing',
      children: [
        {
          name: 'Campañas',
          href: 'marketing?tab=campaigns-overview',
          icon: Megaphone,
          children: [
            { name: 'Resumen', href: 'marketing?tab=campaigns-overview', icon: BarChart3 },
            { name: 'Campañas', href: 'marketing?tab=campaigns-campaigns', icon: List },
            { name: 'Triggers', href: 'marketing?tab=campaigns-triggers', icon: Zap },
            { name: 'Rendimiento', href: 'marketing?tab=campaigns-performance', icon: TrendingUp },
          ]
        },
        { name: 'Productos', href: 'marketing?tab=products', icon: ShoppingBag },
        { name: 'Lealtad', href: 'marketing?tab=loyalty', icon: Award },
        { name: 'Cupones', href: 'marketing?tab=coupons', icon: Tag },
        { name: 'Promociones', href: 'marketing?tab=promotions', icon: Percent },
        { name: 'Bio Link', href: 'marketing?tab=links', icon: Link2 },
      ]
    },
    {
      name: 'CRM',
      href: 'crm',
      icon: Users,
      permission: 'customers_read',
      children: [
        {
          name: 'Contactos',
          href: 'crm?tab=all',
          icon: Users,
          children: [
            { name: 'Todos', href: 'crm?tab=all', icon: Users },
            { name: 'Clientes', href: 'crm?tab=individual', icon: Users },
            { name: 'Proveedores', href: 'crm?tab=supplier', icon: Truck },
          ]
        },
        {
          name: 'Embudo de Ventas',
          href: 'crm?tab=pipeline',
          icon: Filter,
          children: [
            { name: 'Pipeline', href: 'crm?tab=pipeline', icon: BarChart3 },
          ]
        }
      ]
    },

    // 3. Contabilidad, Finanzas y RH
    {
      name: 'Contabilidad General',
      href: 'accounting',
      icon: Calculator,
      permission: 'accounting_read',
      children: [
        { name: 'Facturación Electrónica', href: 'accounting?tab=electronic-invoices', icon: Receipt },
        { name: 'Series de Facturación', href: 'billing/sequences', icon: List, permission: 'billing_read' },
        { name: 'Retenciones Fiscales (IVA e ISLR)', href: 'billing/retenciones', icon: Receipt, permission: 'billing_read' },
        { name: 'Libro Diario', href: 'accounting?tab=journal', icon: FileText },
        { name: 'Libro Mayor', href: 'accounting?tab=general-ledger', icon: BookOpen },
        { name: 'Libro de Ventas', href: 'accounting?tab=sales-book', icon: BookOpen },
        { name: 'Declaración IVA', href: 'accounting?tab=iva-declaration', icon: FileText },
        { name: 'Balance de Comprobación', href: 'accounting?tab=trial-balance', icon: BarChart3 },
        { name: 'Estado de Resultados', href: 'accounting?tab=profit-loss', icon: TrendingUp },
        { name: 'Balance General', href: 'accounting?tab=balance-sheet', icon: AreaChart },
        { name: 'Informes', href: 'accounting?tab=reports', icon: FileText },
      ]
    },
    {
      name: 'Cuentas por Pagar',
      href: 'accounts-payable',
      icon: BanknoteArrowDown,
      permission: 'accounting_read',
      children: [
        { name: 'Cuentas por Pagar', href: 'accounts-payable?tab=monthly', icon: TrendingDown },
        { name: 'Pagos Recurrentes', href: 'accounts-payable?tab=recurring', icon: RefreshCw },
        { name: 'Historial', href: 'accounts-payable?tab=history', icon: List },
      ]
    },
    {
      name: 'Cuentas por Cobrar',
      href: 'receivables?tab=pending',
      icon: BanknoteArrowUp,
      permission: 'accounting_read',
      children: [
        { name: 'Pendientes', href: 'receivables?tab=pending', icon: Clock },
        { name: 'Confirmados', href: 'receivables?tab=confirmed', icon: CheckCircle2 },
        { name: 'Por cliente', href: 'receivables?tab=customers', icon: Users },
        { name: 'Reportes', href: 'receivables?tab=reports', icon: TrendingUp },
      ]
    },
    {
      name: 'Recursos Humanos',
      href: 'payroll/runs',
      icon: UserCog,
      permission: 'payroll_employees_read',
      requiresModule: 'payroll',
      children: [
        {
          name: 'Gestión de Equipo',
          href: 'payroll/employees',
          icon: Users,
          children: [
            { name: 'Empleados', href: 'payroll/employees', icon: Users },
            { name: 'Turnos', href: 'hr/shifts', icon: Clock },
            { name: 'Ausencias', href: 'payroll/absences', icon: CalendarDays },
          ]
        },
        {
          name: 'Nómina',
          href: 'payroll/runs',
          icon: BarChart3,
          children: [
            { name: 'Nómina', href: 'payroll/runs', icon: BarChart3 },
            { name: 'Calendario', href: 'payroll/calendar', icon: CalendarDays },
            { name: 'Estructuras', href: 'payroll/structures', icon: Layers },
          ]
        }
      ],
    },
    { name: 'tips', href: 'tips', icon: CircleDollarSign, permission: 'tips_read', requiresModule: 'tips', dynamicLabel: true },
    { name: 'Comisiones y Metas', href: 'commissions', icon: HandCoins, permission: 'commissions_read', requiresModule: 'commissions' },
    { name: 'Cuentas Bancarias', href: 'bank-accounts', icon: CreditCard, permission: 'accounting_read', requiresModule: 'bankAccounts' },
    { name: 'Activos Fijos', href: 'fixed-assets', icon: Building, permission: 'reports_read', requiresModule: 'fixedAssets' },
    { name: 'Inversiones', href: 'investments', icon: Briefcase, permission: 'reports_read', requiresModule: 'investments' },
    { name: 'Cierre de Caja', href: 'cash-register', icon: Receipt, permission: 'cash_register_read', requiresModule: 'cashRegister' },
    { name: 'Reportes', href: 'reports', icon: AreaChart, permission: 'reports_read' },
    { name: 'Importar Datos', href: 'data-import', icon: Upload, permission: 'data_import_read' },

    // 4. Calendario
    {
      name: 'Calendario',
      href: 'calendar',
      icon: CalendarDays,
      permission: 'events_read',
      children: [
        { name: 'Calendario', href: 'calendar?tab=calendar', icon: CalendarDays },
        { name: 'Configuración', href: 'calendar?tab=management', icon: Settings },
      ]
    },

    // 5. Asistente
    { name: 'Asistente', href: 'assistant', icon: Sparkles, permission: 'dashboard_read' },
  ];
}
