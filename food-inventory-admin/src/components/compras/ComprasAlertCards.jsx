/**
 * @file ComprasAlertCards.jsx
 * Compact alert cards for low-stock and near-expiration items.
 *
 * Each card shows a big counter + the 3 most urgent rows inline. Full list
 * opens in a right-side Sheet via "Ver todos". When the list has ≤3 items,
 * the footer link is hidden because everything is already visible.
 */
import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.jsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet.jsx';
import { AlertTriangle, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';

const PREVIEW_COUNT = 3;

function flattenExpiringLots(expiringProducts) {
  // Each product can have multiple lots; flatten into one row per lot so
  // sorting by expiration date works correctly.
  const rows = [];
  expiringProducts.forEach((item) => {
    (item.lots || []).forEach((lot) => {
      rows.push({
        key: `${item._id}-${lot.lotNumber}`,
        productName: item.productName,
        lotNumber: lot.lotNumber,
        expirationDate: lot.expirationDate,
        item,
      });
    });
  });
  return rows;
}

export default function ComprasAlertCards({
  lowStockProducts,
  expiringProducts,
  handleCreatePoFromAlert,
}) {
  const [openLowStock, setOpenLowStock] = useState(false);
  const [openExpiring, setOpenExpiring] = useState(false);

  const sortedLowStock = useMemo(
    () =>
      [...lowStockProducts].sort(
        (a, b) => (a.availableQuantity || 0) - (b.availableQuantity || 0),
      ),
    [lowStockProducts],
  );

  const sortedExpiring = useMemo(() => {
    const rows = flattenExpiringLots(expiringProducts);
    return rows.sort(
      (a, b) => new Date(a.expirationDate) - new Date(b.expirationDate),
    );
  }, [expiringProducts]);

  const lowStockPreview = sortedLowStock.slice(0, PREVIEW_COUNT);
  const lowStockRest = Math.max(0, sortedLowStock.length - PREVIEW_COUNT);

  const expiringPreview = sortedExpiring.slice(0, PREVIEW_COUNT);
  const expiringRest = Math.max(0, sortedExpiring.length - PREVIEW_COUNT);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ──── Low stock ──── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span>Productos con Bajo Stock</span>
            </span>
            <Badge variant={sortedLowStock.length > 0 ? 'destructive' : 'secondary'}>
              {sortedLowStock.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sortedLowStock.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Sin alertas de stock.</span>
            </div>
          ) : (
            <>
              <ul className="divide-y">
                {lowStockPreview.map((item) => (
                  <li
                    key={item._id}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {item.productName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        SKU: {item.productSku} ·{' '}
                        <span className="text-destructive font-medium">
                          {item.availableQuantity} disp.
                        </span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCreatePoFromAlert(item)}
                    >
                      Crear OC
                    </Button>
                  </li>
                ))}
              </ul>
              {lowStockRest > 0 && (
                <button
                  type="button"
                  onClick={() => setOpenLowStock(true)}
                  className="w-full flex items-center justify-end gap-1 text-sm text-primary hover:underline pt-1"
                >
                  +{lowStockRest} {lowStockRest === 1 ? 'producto más' : 'productos más'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ──── Near expiration ──── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span>Productos Próximos a Vencer</span>
            </span>
            <Badge variant={sortedExpiring.length > 0 ? 'destructive' : 'secondary'}>
              {sortedExpiring.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sortedExpiring.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Sin lotes próximos a vencer.</span>
            </div>
          ) : (
            <>
              <ul className="divide-y">
                {expiringPreview.map((row) => (
                  <li
                    key={row.key}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {row.productName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        Lote: {row.lotNumber} · Vence{' '}
                        <span className="text-orange-600 font-medium">
                          {new Date(row.expirationDate).toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCreatePoFromAlert(row.item)}
                    >
                      Crear OC
                    </Button>
                  </li>
                ))}
              </ul>
              {expiringRest > 0 && (
                <button
                  type="button"
                  onClick={() => setOpenExpiring(true)}
                  className="w-full flex items-center justify-end gap-1 text-sm text-primary hover:underline pt-1"
                >
                  +{expiringRest} {expiringRest === 1 ? 'lote más' : 'lotes más'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ──── Sheet: full low-stock list ──── */}
      <Sheet open={openLowStock} onOpenChange={setOpenLowStock}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Productos con Bajo Stock ({sortedLowStock.length})
            </SheetTitle>
            <SheetDescription>
              Ordenados por menor cantidad disponible. Toca "Crear OC" para
              iniciar una orden de compra con el producto preseleccionado.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Disp.</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLowStock.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell className="text-muted-foreground">{item.productSku}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{item.availableQuantity}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => {
                          handleCreatePoFromAlert(item);
                          setOpenLowStock(false);
                        }}
                      >
                        Crear OC
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SheetContent>
      </Sheet>

      {/* ──── Sheet: full expiring list ──── */}
      <Sheet open={openExpiring} onOpenChange={setOpenExpiring}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Productos Próximos a Vencer ({sortedExpiring.length})
            </SheetTitle>
            <SheetDescription>
              Ordenados por fecha de vencimiento más cercana. Cada fila
              representa un lote específico.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedExpiring.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">{row.productName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.lotNumber}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {new Date(row.expirationDate).toLocaleDateString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => {
                          handleCreatePoFromAlert(row.item);
                          setOpenExpiring(false);
                        }}
                      >
                        Crear OC
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
