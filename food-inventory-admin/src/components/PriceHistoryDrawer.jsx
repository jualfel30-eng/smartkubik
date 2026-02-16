import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import { TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Drawer para mostrar el historial de cambios de precio de un producto
 *
 * @param {Object} props
 * @param {string} props.productId - ID del producto
 * @param {boolean} props.open - Si el drawer está abierto
 * @param {Function} props.onClose - Callback para cerrar el drawer
 */
export function PriceHistoryDrawer({ productId, open, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && productId) {
      loadHistory();
    }
  }, [open, productId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await fetchApi(`/products/${productId}/price-history?limit=50`);
      setHistory(response.data || []);
    } catch (error) {
      console.error('Error loading price history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const getFieldLabel = (field) => {
    const labels = {
      basePrice: 'Precio de Venta',
      costPrice: 'Precio de Costo',
      wholesalePrice: 'Precio Mayorista',
    };
    return labels[field] || field;
  };

  const getFieldColor = (field) => {
    const colors = {
      basePrice: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      costPrice: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      wholesalePrice: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    };
    return colors[field] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:w-[600px]">
        <SheetHeader>
          <SheetTitle>Historial de Cambios de Precio</SheetTitle>
          <SheetDescription>Últimos 50 cambios de precio de este producto</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay cambios de precio registrados
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div
                  key={entry._id || index}
                  className="border rounded-lg p-4 space-y-3 bg-card hover:bg-muted/50 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{entry.variantName}</p>
                      <p className="text-sm text-muted-foreground">{entry.variantSku}</p>
                    </div>
                    <Badge className={getFieldColor(entry.field)}>{getFieldLabel(entry.field)}</Badge>
                  </div>

                  {/* Price Change */}
                  <div className="flex items-center justify-between bg-muted/50 p-3 rounded">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-muted-foreground">
                        ${entry.oldValue.toFixed(2)}
                      </span>
                      {entry.changePercentage >= 0 ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      )}
                      <span className="text-xl font-bold">${entry.newValue.toFixed(2)}</span>
                    </div>
                    <Badge
                      variant={entry.changePercentage >= 0 ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {entry.changePercentage >= 0 ? '+' : ''}
                      {entry.changePercentage.toFixed(1)}%
                    </Badge>
                  </div>

                  {/* Margin Info (for basePrice changes) */}
                  {entry.field === 'basePrice' && entry.marginMetrics && (
                    <div className="text-sm space-y-1 bg-blue-50 dark:bg-blue-950/20 p-3 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-semibold">Impacto en Margen</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Margen anterior:</span>
                        <span className="font-medium">
                          {entry.marginMetrics.oldMargin.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Margen nuevo:</span>
                        <span className="font-medium">
                          {entry.marginMetrics.newMargin.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold pt-1 border-t">
                        <span>Cambio de margen:</span>
                        <span
                          className={
                            entry.marginMetrics.marginDelta >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {entry.marginMetrics.marginDelta >= 0 ? '+' : ''}
                          {entry.marginMetrics.marginDelta.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Pricing Strategy */}
                  {entry.pricingStrategy && entry.pricingStrategy.mode !== 'manual' && (
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {entry.pricingStrategy.mode === 'markup' ? 'Markup' : 'Margin'}{' '}
                        {entry.pricingStrategy.markupPercentage ||
                          entry.pricingStrategy.marginPercentage}
                        %
                      </Badge>
                      {entry.pricingStrategy.psychologicalRounding &&
                        entry.pricingStrategy.psychologicalRounding !== 'none' && (
                          <Badge variant="outline" className="text-xs">
                            Redondeo: {entry.pricingStrategy.psychologicalRounding}
                          </Badge>
                        )}
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(new Date(entry.createdAt), "d 'de' MMMM, yyyy 'a las' HH:mm", {
                          locale: es,
                        })}
                      </span>
                    </div>
                    <span>por {entry.changedByName}</span>
                  </div>

                  {/* Reason */}
                  {entry.reason && (
                    <div className="text-sm italic text-muted-foreground bg-muted/50 p-2 rounded">
                      Motivo: {entry.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
