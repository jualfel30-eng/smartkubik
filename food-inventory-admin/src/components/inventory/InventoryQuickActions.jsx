/**
 * InventoryQuickActions.jsx
 * Compact inline shortcuts — text links, not full buttons.
 * UX: Reduces visual weight while keeping quick access.
 */
import { motion } from 'framer-motion';
import { PackagePlus, ClipboardCheck, ShoppingCart, ArrowRightLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { scaleIn, STAGGER } from '@/lib/motion';

export default function InventoryQuickActions({
  onAddInventory,
  onReceivePO,
  onNewPO,
  onNewTransfer,
  pendingPOCount = 0,
  multiLocationEnabled = false,
}) {
  const actions = [
    { key: 'add', label: 'Agregar inventario', icon: PackagePlus, onClick: onAddInventory },
    { key: 'receive', label: 'Recibir pedido', icon: ClipboardCheck, onClick: onReceivePO, badge: pendingPOCount },
    { key: 'newPO', label: 'Nueva compra', icon: ShoppingCart, onClick: onNewPO },
    ...(multiLocationEnabled
      ? [{ key: 'transfer', label: 'Trasladar', icon: ArrowRightLeft, onClick: onNewTransfer }]
      : []),
  ];

  return (
    <motion.div
      className="flex items-center gap-1 text-xs"
      variants={STAGGER(0.03)}
      initial="initial"
      animate="animate"
    >
      <span className="text-muted-foreground mr-1">Acceso rapido:</span>
      {actions.map((action, i) => {
        const Icon = action.icon;
        return (
          <motion.button
            key={action.key}
            variants={scaleIn}
            whileTap={{ scale: 0.95 }}
            onClick={action.onClick}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <Icon className="h-3 w-3" />
            <span>{action.label}</span>
            {action.badge > 0 && (
              <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px] font-bold">
                {action.badge}
              </Badge>
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
