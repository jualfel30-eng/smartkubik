import { useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Route-segment → display-label map.
 * Only the most visited routes need entries — unknown segments
 * are title-cased automatically.
 */
const LABELS = {
  dashboard: 'Dashboard',
  'inventory-management': 'Inventario',
  crm: 'CRM',
  appointments: 'Citas',
  services: 'Servicios',
  resources: 'Recursos',
  settings: 'Configuración',
  orders: 'Pedidos',
  accounting: 'Contabilidad',
  billing: 'Facturación',
  payroll: 'Nómina',
  marketing: 'Marketing',
  fulfillment: 'Entregas',
  production: 'Producción',
  reports: 'Reportes',
  calendar: 'Calendario',
  'cash-register': 'Caja',
  'bank-accounts': 'Bancos',
  'fixed-assets': 'Activos Fijos',
  investments: 'Inversiones',
  'accounts-payable': 'Cuentas por Pagar',
  receivables: 'Cuentas por Cobrar',
  'business-locations': 'Sucursales',
  subsidiaries: 'Subsidiarias',
  'waste-control': 'Merma',
  whatsapp: 'WhatsApp',
  tips: 'Propinas',
  commissions: 'Comisiones',
  'data-import': 'Importar Datos',
  assistant: 'Asistente',
  restaurant: 'Restaurante',
  hospitality: 'Hospitalidad',
  hr: 'Recursos Humanos',
  driver: 'Conductor',
  // sub-segments
  new: 'Nuevo',
  history: 'Historial',
  employees: 'Empleados',
  runs: 'Nóminas',
  structures: 'Estructuras',
  absences: 'Ausencias',
  shifts: 'Turnos',
  'floor-plan': 'Plano',
  'kitchen-display': 'Cocina',
  recipes: 'Recetas',
  reservations: 'Reservaciones',
  'menu-engineering': 'Ingeniería de Menú',
  storefront: 'Tienda Online',
  sequences: 'Secuencias',
  retenciones: 'Retenciones',
  wizard: 'Asistente',
  operations: 'Operaciones',
  deposits: 'Depósitos',
};

function titleCase(s) {
  return s
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AppBreadcrumb() {
  const { pathname } = useLocation();

  const crumbs = useMemo(() => {
    const segments = pathname.replace(/^\/+/, '').split('/').filter(Boolean);
    // Don't show breadcrumb on dashboard (it's home)
    if (segments.length <= 1 && segments[0] === 'dashboard') return [];

    return segments.map((seg, i) => ({
      label: LABELS[seg] || titleCase(seg),
      path: '/' + segments.slice(0, i + 1).join('/'),
      isLast: i === segments.length - 1,
    }));
  }, [pathname]);

  if (crumbs.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground mb-4"
    >
      <Link
        to="/dashboard"
        className="hover:text-foreground transition-colors"
      >
        <Home size={14} />
      </Link>

      {crumbs.map((crumb) => (
        <span key={crumb.path} className="flex items-center gap-1.5">
          <ChevronRight size={12} className="text-muted-foreground/50" />
          {crumb.isLast ? (
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {crumb.label}
            </span>
          ) : (
            <Link
              to={crumb.path}
              className="hover:text-foreground transition-colors truncate max-w-[160px]"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
