/**
 * InventoryModuleCards.jsx
 *
 * Card-based navigation replacing tab bar.
 * UX science: Miller's Law (4±1 chunks), Recognition > Recall,
 * Fitts's Law (larger targets), Rosch Categorization.
 *
 * 5 cards representing mental-model groups:
 * - Productos (catalogs)
 * - Inventario (where is my stock)
 * - Movimientos (what moved)
 * - Compras (procurement flow)
 * - Reportes (analysis)
 */
import { motion } from 'framer-motion';
import {
  Package,
  Warehouse,
  ArrowLeftRight,
  ShoppingCart,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import { STAGGER, scaleIn } from '@/lib/motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const MODULE_CARDS = [
  {
    id: 'productos',
    label: 'Productos',
    description: 'Catalogo, materias primas, consumibles y suministros',
    icon: Package,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    borderHover: 'hover:border-blue-500/40',
    glowHover: 'hover:shadow-blue-500/5',
    defaultTab: 'products',
  },
  {
    id: 'inventario',
    label: 'Inventario',
    description: 'Stock actual y ubicaciones en almacenes',
    icon: Warehouse,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    borderHover: 'hover:border-emerald-500/40',
    glowHover: 'hover:shadow-emerald-500/5',
    defaultTab: 'inventory',
    // Dynamic: shows warehouse sub-nav if enabled
    conditionalTabs: ['inventory-warehouses'],
  },
  {
    id: 'movimientos',
    label: 'Movimientos',
    description: 'Historial de entradas, salidas y traslados',
    icon: ArrowLeftRight,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    borderHover: 'hover:border-amber-500/40',
    glowHover: 'hover:shadow-amber-500/5',
    defaultTab: 'inventory-movements',
    conditionalTabs: ['transfers'],
  },
  {
    id: 'compras',
    label: 'Compras',
    description: 'Ordenes de compra, proveedores y alertas de stock',
    icon: ShoppingCart,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    borderHover: 'hover:border-purple-500/40',
    glowHover: 'hover:shadow-purple-500/5',
    defaultTab: 'purchases',
  },
  {
    id: 'reportes',
    label: 'Reportes',
    description: 'Analisis de movimientos, costos y documentos',
    icon: BarChart3,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    borderHover: 'hover:border-cyan-500/40',
    glowHover: 'hover:shadow-cyan-500/5',
    defaultTab: 'inventory-reports',
  },
];

export default function InventoryModuleCards({
  onSelectModule,
  kpiData,
  showWarehouses,
  multiLocationEnabled,
}) {
  return (
    <motion.div
      className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3"
      variants={STAGGER(0.06)}
      initial="initial"
      animate="animate"
    >
      {MODULE_CARDS.map((card) => {
        const Icon = card.icon;

        // Determine badge info
        let badgeText = null;
        let badgeVariant = 'secondary';
        if (card.id === 'compras' && kpiData?.lowStock > 0) {
          badgeText = `${kpiData.lowStock} alerta${kpiData.lowStock > 1 ? 's' : ''}`;
          badgeVariant = 'destructive';
        }
        if (card.id === 'compras' && kpiData?.pendingPOs > 0) {
          badgeText = `${kpiData.pendingPOs} pendiente${kpiData.pendingPOs > 1 ? 's' : ''}`;
          badgeVariant = 'secondary';
        }
        if (card.id === 'movimientos' && kpiData?.inTransit > 0) {
          badgeText = `${kpiData.inTransit} en transito`;
          badgeVariant = 'secondary';
        }

        return (
          <motion.button
            key={card.id}
            variants={scaleIn}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectModule(card.defaultTab)}
            className={cn(
              'group relative rounded-xl border bg-card p-5 text-left transition-all duration-200',
              'hover:shadow-lg cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              card.borderHover,
              card.glowHover,
            )}
          >
            {/* Icon */}
            <div className={cn('rounded-lg p-2.5 w-fit mb-3', card.bg)}>
              <Icon className={cn('h-5 w-5', card.color)} />
            </div>

            {/* Title + Badge */}
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-semibold text-foreground group-hover:text-foreground/90">
                {card.label}
              </h3>
              {badgeText && (
                <Badge variant={badgeVariant} className="text-[10px] px-1.5 py-0">
                  {badgeText}
                </Badge>
              )}
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              {card.description}
            </p>

            {/* Subtle arrow indicator on hover */}
            <div className="absolute top-4 right-4 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:translate-x-0.5">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}

export { MODULE_CARDS };
