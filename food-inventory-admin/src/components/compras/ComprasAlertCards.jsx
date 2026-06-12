/**
 * @file ComprasAlertCards.jsx
 * Compact alert cards for low-stock and near-expiration items.
 *
 * Each card shows a big counter + the 3 most urgent rows inline. Full list
 * opens in a right-side Sheet via "Ver todos" where the user can:
 *  - Toggle multiple items with checkboxes.
 *  - Use the "Seleccionar todos del proveedor X" chip to grab everything
 *    sharing the preferred supplier of the first selected item.
 *  - Click "Crear OC con N productos" to open the PO dialog pre-loaded
 *    with all selected items (and pre-filled supplier when they share one).
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
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet.jsx';
import {
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckCircle2,
  Users,
} from 'lucide-react';

const PREVIEW_COUNT = 3;

function flattenExpiringLots(expiringProducts) {
  // Each product can have multiple lots; flatten into one row per lot so
  // sorting by expiration date works correctly. Preserve the parent item
  // so the batch handler still gets the full productId payload.
  const rows = [];
  expiringProducts.forEach((item) => {
    (item.lots || []).forEach((lot) => {
      rows.push({
        key: `${item._id}-${lot.lotNumber}`,
        productName: item.productName,
        lotNumber: lot.lotNumber,
        expirationDate: lot.expirationDate,
        item, // original alert item — passes through to handleCreatePoFromAlert*
      });
    });
  });
  return rows;
}

function getPreferredSupplierId(alertItem) {
  const id = alertItem?.productId?.suppliers?.[0]?.supplierId;
  if (!id) return null;
  return typeof id === 'string' ? id : id?.toString?.() || null;
}

function getPreferredSupplierName(alertItem) {
  return (
    alertItem?.productId?.suppliers?.[0]?.supplierName ||
    alertItem?.productId?.suppliers?.[0]?.companyName ||
    null
  );
}

/**
 * Mini-component to render a Sheet with multi-select + batch CTA. Re-used
 * by both alert types so the layout stays consistent.
 */
function AlertListSheet({
  open,
  onOpenChange,
  title,
  icon: Icon,
  iconClassName,
  description,
  rows,
  renderColumns,
  onCreatePoBatch,
  getAlertItem,
  getRowId,
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());

  const allChecked = rows.length > 0 && selectedIds.size === rows.length;
  const indeterminate = selectedIds.size > 0 && selectedIds.size < rows.length;

  const toggleAll = () => {
    if (allChecked) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map(getRowId)));
    }
  };

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Compute supplier hint based on the first selected row.
  const firstSelectedRow = useMemo(() => {
    if (selectedIds.size === 0) return null;
    return rows.find((r) => selectedIds.has(getRowId(r))) || null;
  }, [rows, selectedIds, getRowId]);

  const anchorSupplierId = firstSelectedRow
    ? getPreferredSupplierId(getAlertItem(firstSelectedRow))
    : null;
  const anchorSupplierName = firstSelectedRow
    ? getPreferredSupplierName(getAlertItem(firstSelectedRow))
    : null;

  const sameSupplierMatchCount = useMemo(() => {
    if (!anchorSupplierId) return 0;
    return rows.filter(
      (r) => getPreferredSupplierId(getAlertItem(r)) === anchorSupplierId,
    ).length;
  }, [rows, anchorSupplierId, getAlertItem]);

  const selectSameSupplier = () => {
    if (!anchorSupplierId) return;
    const matching = rows
      .filter((r) => getPreferredSupplierId(getAlertItem(r)) === anchorSupplierId)
      .map(getRowId);
    setSelectedIds(new Set(matching));
  };

  const handleSubmit = () => {
    const picked = rows
      .filter((r) => selectedIds.has(getRowId(r)))
      .map(getAlertItem);
    if (picked.length === 0) return;
    onCreatePoBatch(picked);
    setSelectedIds(new Set());
    onOpenChange(false);
  };

  // Reset selection when the sheet closes.
  const handleOpenChange = (next) => {
    if (!next) setSelectedIds(new Set());
    onOpenChange(next);
  };

  const showSupplierChip =
    anchorSupplierId && sameSupplierMatchCount > selectedIds.size;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {/*
        SheetContent already ships `flex flex-col gap-4` from the primitive,
        so we lay the inner regions as flex children:
          - Header: shrink-0
          - Body:   flex-1 + overflow-y-auto (this is what scrolls)
          - Footer: shrink-0 + border-t (stays pinned at the bottom)
        This avoids `position: fixed` on the footer, which is unreliable
        inside Radix portals/transforms.
      */}
      <SheetContent className="w-full sm:max-w-5xl gap-0 p-0">
        <div className="shrink-0 px-6 pt-6 pb-4 border-b">
          <SheetHeader className="p-0">
            <SheetTitle className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${iconClassName}`} />
              {title} ({rows.length})
            </SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allChecked || (indeterminate ? 'indeterminate' : false)}
                    onCheckedChange={toggleAll}
                    aria-label="Seleccionar todos"
                  />
                </TableHead>
                {renderColumns.headers}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const id = getRowId(row);
                const isSelected = selectedIds.has(id);
                return (
                  <TableRow
                    key={id}
                    data-state={isSelected ? 'selected' : undefined}
                    className="cursor-pointer"
                    onClick={() => toggleRow(id)}
                  >
                    <TableCell
                      className="w-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(id)}
                        aria-label={`Seleccionar ${getRowId(row)}`}
                      />
                    </TableCell>
                    {renderColumns.cells(row)}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {rows.length > 0 && (
          <div className="shrink-0 border-t bg-background px-6 py-3 flex flex-col gap-2">
            {showSupplierChip && (
              <button
                type="button"
                onClick={selectSameSupplier}
                className="self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
              >
                <Users className="h-3.5 w-3.5" />
                Seleccionar todos del proveedor
                {anchorSupplierName ? ` "${anchorSupplierName}"` : ''} (
                {sameSupplierMatchCount})
              </button>
            )}
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size === 0
                  ? 'Selecciona productos para crear una OC'
                  : `${selectedIds.size} ${selectedIds.size === 1 ? 'producto seleccionado' : 'productos seleccionados'}`}
              </span>
              <Button onClick={handleSubmit} disabled={selectedIds.size === 0}>
                Crear OC con {selectedIds.size || 0}{' '}
                {selectedIds.size === 1 ? 'producto' : 'productos'}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function ComprasAlertCards({
  lowStockProducts,
  expiringProducts,
  handleCreatePoFromAlert,
  handleCreatePoFromAlertBatch,
  loading = false,
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

  // Las alertas cargan aparte del resto del módulo (no bloquean botón ni historial).
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-56 rounded" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-9 w-full rounded" />
              <Skeleton className="h-9 w-full rounded" />
              <Skeleton className="h-9 w-3/4 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

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
              <button
                type="button"
                onClick={() => setOpenLowStock(true)}
                className="w-full flex items-center justify-end gap-1 text-sm text-primary hover:underline pt-1"
              >
                {lowStockRest > 0
                  ? `+${lowStockRest} ${lowStockRest === 1 ? 'producto más' : 'productos más'} · Ver y seleccionar`
                  : 'Ver lista y seleccionar varios'}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
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
              <button
                type="button"
                onClick={() => setOpenExpiring(true)}
                className="w-full flex items-center justify-end gap-1 text-sm text-primary hover:underline pt-1"
              >
                {expiringRest > 0
                  ? `+${expiringRest} ${expiringRest === 1 ? 'lote más' : 'lotes más'} · Ver y seleccionar`
                  : 'Ver lista y seleccionar varios'}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </CardContent>
      </Card>

      {/* ──── Sheet: low-stock list ──── */}
      <AlertListSheet
        open={openLowStock}
        onOpenChange={setOpenLowStock}
        title="Productos con Bajo Stock"
        icon={AlertTriangle}
        iconClassName="text-destructive"
        description="Selecciona varios productos para incluirlos en una sola orden de compra. Si comparten proveedor preferido, se preselecciona automáticamente."
        rows={sortedLowStock}
        onCreatePoBatch={handleCreatePoFromAlertBatch}
        getAlertItem={(row) => row}
        getRowId={(row) => row._id}
        renderColumns={{
          headers: (
            <>
              <TableHead>Producto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Disp.</TableHead>
              <TableHead>Proveedor preferido</TableHead>
            </>
          ),
          cells: (item) => (
            <>
              <TableCell className="font-medium">{item.productName}</TableCell>
              <TableCell className="text-muted-foreground">{item.productSku}</TableCell>
              <TableCell>
                <Badge variant="destructive">{item.availableQuantity}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {getPreferredSupplierName(item) || '—'}
              </TableCell>
            </>
          ),
        }}
      />

      {/* ──── Sheet: expiring list ──── */}
      <AlertListSheet
        open={openExpiring}
        onOpenChange={setOpenExpiring}
        title="Productos Próximos a Vencer"
        icon={Clock}
        iconClassName="text-orange-500"
        description="Ordenados por fecha más cercana. Selecciona varios lotes para reponer en una sola orden de compra."
        rows={sortedExpiring}
        onCreatePoBatch={handleCreatePoFromAlertBatch}
        getAlertItem={(row) => row.item}
        getRowId={(row) => row.key}
        renderColumns={{
          headers: (
            <>
              <TableHead>Producto</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead>Proveedor preferido</TableHead>
            </>
          ),
          cells: (row) => (
            <>
              <TableCell className="font-medium">{row.productName}</TableCell>
              <TableCell className="text-muted-foreground">{row.lotNumber}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {new Date(row.expirationDate).toLocaleDateString()}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {getPreferredSupplierName(row.item) || '—'}
              </TableCell>
            </>
          ),
        }}
      />
    </div>
  );
}
