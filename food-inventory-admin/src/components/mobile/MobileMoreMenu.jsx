import { Link } from 'react-router-dom';
import {
  Package, Truck, BarChart3, DollarSign, Settings, Users, Briefcase,
  FileText, Boxes, Store, Layers, Palette,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useMobileVertical } from '@/hooks/use-mobile-vertical';

// Páginas secundarias accesibles desde el drawer "Más" en mobile.
// Para beauty, exponemos solo lo relevante. Otras verticales reciben un set más amplio.

const BEAUTY_ITEMS = [
  { to: '/services-management', label: 'Servicios', icon: Palette },
  { to: '/resources', label: 'Recursos / Empleados', icon: Users },
  { to: '/inventory-management', label: 'Inventario', icon: Boxes },
  { to: '/cash-register', label: 'Caja', icon: DollarSign },
  { to: '/reports', label: 'Reportes', icon: BarChart3 },
  { to: '/settings', label: 'Ajustes', icon: Settings },
];

const DEFAULT_ITEMS = [
  { to: '/products', label: 'Productos', icon: Package },
  { to: '/inventory-management', label: 'Inventario', icon: Boxes },
  { to: '/purchase-orders', label: 'Compras', icon: Truck },
  { to: '/storefront', label: 'Tienda online', icon: Store },
  { to: '/cash-register', label: 'Caja', icon: DollarSign },
  { to: '/reports', label: 'Reportes', icon: BarChart3 },
  { to: '/accounting', label: 'Contabilidad', icon: FileText },
  { to: '/payroll/employees', label: 'Nómina', icon: Briefcase },
  { to: '/settings', label: 'Ajustes', icon: Settings },
];

export default function MobileMoreMenu() {
  const { tenant, user } = useAuth();
  const { isBeauty } = useMobileVertical();
  const items = isBeauty ? BEAUTY_ITEMS : DEFAULT_ITEMS;

  return (
    <div className="md:hidden mobile-content-pad">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">Más</h1>
        <p className="text-sm text-muted-foreground">
          {tenant?.name || 'SmartKubik'} · {user?.firstName || 'Usuario'}
        </p>
      </header>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="no-tap-highlight no-select flex flex-col items-start gap-2
                         rounded-[var(--mobile-radius-lg)] border border-border bg-card p-4
                         min-h-[96px] active:scale-[0.98] transition-transform"
            >
              <Icon size={22} className="text-primary" />
              <span className="text-sm font-medium leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
