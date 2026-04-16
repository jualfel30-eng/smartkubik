import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Users,
  Calendar,
  Calculator,
  Settings,
  Briefcase,
  UserSquare,
  Store,
  Mail,
  Factory,
  Truck,
  PackageCheck,
  Search,
  FileText,
  BarChart3,
  CreditCard,
  UserCog,
  Building,
  MessageCircleMore,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

/**
 * Navigation items available in the command palette.
 * Flat list — no nesting. Most-used routes first.
 */
const NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, keywords: 'inicio panel home' },
  { name: 'Nueva Orden', href: '/orders/new', icon: ShoppingCart, keywords: 'pedido venta pos' },
  { name: 'Historial de Órdenes', href: '/orders/history', icon: ShoppingCart, keywords: 'pedidos ventas' },
  { name: 'Inventario', href: '/inventory-management', icon: Boxes, keywords: 'productos stock almacen' },
  { name: 'Productos', href: '/inventory-management?tab=products', icon: Boxes, keywords: 'catalogo mercancia' },
  { name: 'CRM — Clientes', href: '/crm', icon: Users, keywords: 'contactos clientes proveedores' },
  { name: 'Citas / Agenda', href: '/appointments', icon: Calendar, keywords: 'reservas booking' },
  { name: 'Servicios', href: '/services', icon: Briefcase, keywords: 'catalogo servicios' },
  { name: 'Recursos / Profesionales', href: '/resources', icon: UserSquare, keywords: 'equipo estaciones' },
  { name: 'Contabilidad', href: '/accounting', icon: Calculator, keywords: 'facturacion libros' },
  { name: 'Cuentas por Cobrar', href: '/receivables', icon: CreditCard, keywords: 'cobranza pagos' },
  { name: 'Compras', href: '/inventory-management?tab=purchases', icon: Truck, keywords: 'ordenes compra proveedores' },
  { name: 'Marketing', href: '/marketing', icon: Mail, keywords: 'campanas email loyalty cupones' },
  { name: 'Producción', href: '/production', icon: Factory, keywords: 'manufactura bom ordenes' },
  { name: 'Entregas', href: '/fulfillment', icon: PackageCheck, keywords: 'delivery despacho' },
  { name: 'Nómina', href: '/payroll/runs', icon: UserCog, keywords: 'nomina empleados sueldos' },
  { name: 'Reportes', href: '/reports', icon: BarChart3, keywords: 'analytics estadisticas' },
  { name: 'WhatsApp', href: '/whatsapp', icon: MessageCircleMore, keywords: 'chat mensajes' },
  { name: 'Tienda Online', href: '/storefront', icon: Store, keywords: 'ecommerce menu online' },
  { name: 'Sucursales', href: '/business-locations', icon: Building, keywords: 'sedes ubicaciones' },
  { name: 'Configuración', href: '/settings', icon: Settings, keywords: 'ajustes perfil' },
];

/**
 * Quick actions — things the user can trigger immediately.
 */
const ACTIONS = [
  { name: 'Crear Orden', action: '/orders/new', icon: ShoppingCart, keywords: 'nueva orden pedido' },
  { name: 'Nuevo Cliente', action: '/crm?new=true', icon: Users, keywords: 'agregar cliente contacto' },
  { name: 'Abrir Configuración', action: '/settings', icon: Settings, keywords: 'ajustes config' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();
  const { tenant } = useAuth();

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Search customers/products when query is long enough
  const searchEntities = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const [customersRes, productsRes] = await Promise.allSettled([
        fetchApi(`/customers?search=${encodeURIComponent(q)}&limit=5`),
        fetchApi(`/products?search=${encodeURIComponent(q)}&limit=5`),
      ]);

      const results = [];
      if (customersRes.status === 'fulfilled' && customersRes.value?.data) {
        const customers = Array.isArray(customersRes.value.data)
          ? customersRes.value.data
          : customersRes.value.data.data || [];
        customers.slice(0, 5).forEach((c) => {
          results.push({
            type: 'customer',
            name: c.name || c.companyName || 'Sin nombre',
            detail: c.taxInfo?.taxId || c.phone || '',
            id: c._id,
          });
        });
      }
      if (productsRes.status === 'fulfilled' && productsRes.value?.data) {
        const products = Array.isArray(productsRes.value.data)
          ? productsRes.value.data
          : productsRes.value.data.data || [];
        products.slice(0, 5).forEach((p) => {
          results.push({
            type: 'product',
            name: p.name,
            detail: p.sku || '',
            id: p._id,
          });
        });
      }
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => searchEntities(query), 300);
    return () => clearTimeout(timer);
  }, [query, searchEntities]);

  const handleSelect = (href) => {
    setOpen(false);
    setQuery('');
    navigate(href);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Buscar"
      description="Navega, busca clientes o productos"
    >
      <CommandInput
        placeholder="Buscar módulo, cliente, producto..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {searching ? 'Buscando...' : 'No se encontraron resultados.'}
        </CommandEmpty>

        {/* Dynamic search results */}
        {searchResults.length > 0 && (
          <>
            <CommandGroup heading="Resultados">
              {searchResults.map((r) => (
                <CommandItem
                  key={`${r.type}-${r.id}`}
                  onSelect={() => handleSelect(
                    r.type === 'customer' ? `/crm?selected=${r.id}` : `/inventory-management?tab=products&selected=${r.id}`
                  )}
                >
                  {r.type === 'customer' ? <Users className="text-blue-500" /> : <Boxes className="text-emerald-500" />}
                  <div className="flex flex-col">
                    <span>{r.name}</span>
                    {r.detail && <span className="text-xs text-muted-foreground">{r.detail}</span>}
                  </div>
                  <CommandShortcut>{r.type === 'customer' ? 'Cliente' : 'Producto'}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Navigation */}
        <CommandGroup heading="Navegación">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.href}
              value={`${item.name} ${item.keywords}`}
              onSelect={() => handleSelect(item.href)}
            >
              <item.icon />
              <span>{item.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Quick actions */}
        <CommandGroup heading="Acciones rápidas">
          {ACTIONS.map((action) => (
            <CommandItem
              key={action.action}
              value={`${action.name} ${action.keywords}`}
              onSelect={() => handleSelect(action.action)}
            >
              <action.icon />
              <span>{action.name}</span>
              <CommandShortcut>Acción</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
