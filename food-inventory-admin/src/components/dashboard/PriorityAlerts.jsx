import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeUp } from '@/lib/motion';
import { AlertTriangle, Truck, ChevronRight, X } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PriorityAlerts({ lowStockCount = 0, pendingPurchaseOrders = 0 }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  const hasAlerts = (lowStockCount > 0 || pendingPurchaseOrders > 0) && !dismissed;

  return (
    <AnimatePresence>
      {hasAlerts && (
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Necesita tu atencion
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setDismissed(true)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3 pt-0">
              {lowStockCount > 0 && (
                <button
                  onClick={() => navigate('/inventory-management')}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-amber-200 hover:bg-amber-500/10 transition-colors"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  {lowStockCount} producto{lowStockCount !== 1 ? 's' : ''} con stock bajo
                  <ChevronRight className="h-3.5 w-3.5 ml-1 opacity-60" />
                </button>
              )}
              {pendingPurchaseOrders > 0 && (
                <button
                  onClick={() => navigate('/purchases')}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-amber-200 hover:bg-amber-500/10 transition-colors"
                >
                  <Truck className="h-3.5 w-3.5 text-amber-500" />
                  {pendingPurchaseOrders} orden{pendingPurchaseOrders !== 1 ? 'es' : ''} de compra pendiente{pendingPurchaseOrders !== 1 ? 's' : ''}
                  <ChevronRight className="h-3.5 w-3.5 ml-1 opacity-60" />
                </button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
