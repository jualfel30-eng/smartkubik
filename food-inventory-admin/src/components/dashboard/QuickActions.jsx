import { useNavigate } from 'react-router-dom';
import { PlusCircle, Truck, Package, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollRevealGroup } from '@/components/ui/scroll-reveal';

const actions = [
  { label: 'Nuevo Pedido', icon: PlusCircle, path: '/orders' },
  { label: 'Orden de Compra', icon: Truck, path: '/purchases' },
  { label: 'Agregar Producto', icon: Package, path: '/products' },
  { label: 'Ver Inventario', icon: ClipboardList, path: '/inventory-management' },
];

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <ScrollRevealGroup className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <Button
          key={action.path}
          variant="outline"
          size="sm"
          onClick={() => navigate(action.path)}
          className="gap-2"
        >
          <action.icon className="h-4 w-4" />
          {action.label}
        </Button>
      ))}
    </ScrollRevealGroup>
  );
}
