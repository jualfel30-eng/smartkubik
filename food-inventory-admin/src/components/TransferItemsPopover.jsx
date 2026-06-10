import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge.jsx';
import { Package, AlertTriangle } from 'lucide-react';

/**
 * Decide qué cantidad es relevante para mostrar según el estado de la orden,
 * y si existe una discrepancia digna de resaltar (faltante / sobrante).
 *
 * - Etapas previas al envío -> cantidad solicitada (o aprobada si existe).
 * - En tránsito / entregado   -> cantidad enviada vs. solicitada.
 * - Recibido / parcial        -> cantidad recibida vs. solicitada.
 */
function resolveQuantity(item, status) {
  const requested = item.requestedQuantity ?? 0;
  const approved = item.approvedQuantity;
  const shipped = item.shippedQuantity;
  const received = item.receivedQuantity;

  let stageLabel = 'Solicitado';
  let value = requested;

  if (status === 'in_transit' || status === 'delivered') {
    if (shipped != null) {
      stageLabel = 'Enviado';
      value = shipped;
    }
  } else if (status === 'received' || status === 'partially_received') {
    if (received != null) {
      stageLabel = 'Recibido';
      value = received;
    }
  } else if (approved != null && (status === 'push_approved' || status === 'pull_approved' || status === 'in_preparation')) {
    stageLabel = 'Aprobado';
    value = approved;
  }

  // Discrepancia: lo que llegó/salió difiere de lo solicitado.
  const hasDiscrepancy =
    (stageLabel === 'Recibido' || stageLabel === 'Enviado') &&
    value !== requested;

  return { stageLabel, value, requested, hasDiscrepancy };
}

/**
 * TransferItemsPopover
 *
 * Vista rápida read-only de los items de un traslado, sin abrir el detalle.
 * Muestra producto · cantidad relevante a la etapa · resalta faltantes/sobrantes.
 */
export default function TransferItemsPopover({ items = [], status, children }) {
  const count = items.length;

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="p-3 border-b flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <div>
            <h4 className="font-medium leading-none text-sm">
              {count} {count === 1 ? 'producto trasladado' : 'productos trasladados'}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cantidades según el estado actual de la orden.
            </p>
          </div>
        </div>
        {count === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            Esta orden no tiene items.
          </div>
        ) : (
          <div className="max-h-[320px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => {
                  const { stageLabel, value, requested, hasDiscrepancy } = resolveQuantity(item, status);
                  const unit = item.selectedUnit || item.unitOfMeasure || '';
                  return (
                    <TableRow key={item.productId || index}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-xs leading-tight">
                            {item.productName || 'Producto sin nombre'}
                          </span>
                          {item.productSku && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {item.productSku}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-xs tabular-nums">
                            <span className="font-medium">{value}</span>
                            {unit && <span className="text-muted-foreground"> {unit}</span>}
                          </span>
                          {hasDiscrepancy ? (
                            <Badge variant="destructive" className="h-4 px-1 text-[9px] gap-0.5">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              {stageLabel} · pedido {requested}
                            </Badge>
                          ) : (
                            <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
                              {stageLabel}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
