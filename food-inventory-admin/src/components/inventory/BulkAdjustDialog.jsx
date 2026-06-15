/**
 * BulkAdjustDialog.jsx
 *
 * Ajuste masivo de inventario (conteo físico). Recibe los snapshots de las
 * filas seleccionadas — que persisten a través de paginación y búsqueda — y
 * permite editar la cantidad en stock de cada una.
 *
 * Cada fila se ajusta vía POST /inventory/adjust (por inventoryId), el mismo
 * camino que usa InlineStockAdjust: fija la cantidad absoluta, calcula el delta
 * y deja un movimiento de auditoría/kardex por producto. Se reporta el
 * resultado por fila (éxito/fallo) sin bloquear el resto.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { recordActivity } from '@/components/inventory/DailyStreak.jsx';

const REASONS = [
  { value: 'Conteo físico', label: 'Conteo físico' },
  { value: 'Compra', label: 'Compra' },
  { value: 'Devolución', label: 'Devolución' },
  { value: 'Daño', label: 'Daño' },
  { value: 'Merma', label: 'Merma' },
  { value: 'Otro', label: 'Otro' },
];

export function BulkAdjustDialog({ open, onOpenChange, items, onComplete, onRemoveItem }) {
  // Mapa local id -> nueva cantidad (string para permitir edición libre)
  const [quantities, setQuantities] = useState({});
  const [reason, setReason] = useState('Conteo físico');
  const [saving, setSaving] = useState(false);
  const [failedIds, setFailedIds] = useState(new Set());

  // Inicializa/sincroniza las cantidades cuando cambian los items o se abre el diálogo.
  useEffect(() => {
    if (!open) return;
    setQuantities((prev) => {
      const next = {};
      for (const item of items) {
        // Conserva lo que el usuario ya escribió; si es nuevo, parte del stock actual.
        next[item._id] = prev[item._id] !== undefined ? prev[item._id] : String(item.currentQty ?? 0);
      }
      return next;
    });
    setFailedIds(new Set());
  }, [open, items]);

  const handleQtyChange = (id, value) => {
    setQuantities((prev) => ({ ...prev, [id]: value }));
  };

  // Filas con cambio real y cantidad válida.
  const edits = useMemo(() => {
    return items
      .map((item) => {
        const raw = quantities[item._id];
        const newQuantity = Number(raw);
        if (raw === '' || raw === undefined || Number.isNaN(newQuantity) || newQuantity < 0) return null;
        if (newQuantity === (item.currentQty ?? 0)) return null; // sin cambio → no-op
        return { item, newQuantity };
      })
      .filter(Boolean);
  }, [items, quantities]);

  const hasInvalid = useMemo(() => {
    return items.some((item) => {
      const raw = quantities[item._id];
      if (raw === '' || raw === undefined) return false; // vacío = sin cambio, no inválido
      const n = Number(raw);
      return Number.isNaN(n) || n < 0;
    });
  }, [items, quantities]);

  const handleConfirm = async () => {
    if (!reason) {
      toast.error('La razón del ajuste es obligatoria.');
      return;
    }
    if (edits.length === 0) {
      toast.info('No hay cambios de cantidad por aplicar.');
      return;
    }

    setSaving(true);
    const results = await Promise.allSettled(
      edits.map(({ item, newQuantity }) =>
        fetchApi('/inventory/adjust', {
          method: 'POST',
          body: JSON.stringify({
            inventoryId: item._id,
            newQuantity,
            reason,
          }),
        }).then(() => item._id),
      ),
    );
    setSaving(false);

    const failed = new Set();
    let okCount = 0;
    results.forEach((res, idx) => {
      if (res.status === 'fulfilled') {
        okCount += 1;
      } else {
        failed.add(edits[idx].item._id);
      }
    });
    setFailedIds(failed);

    if (okCount > 0) recordActivity();

    if (failed.size === 0) {
      toast.success(`Inventario ajustado: ${okCount} producto(s).`);
      onComplete?.();
    } else if (okCount > 0) {
      toast.warning(`${okCount} ajustado(s), ${failed.size} con error. Revisa los marcados en rojo.`);
      onComplete?.({ keepOpen: true });
    } else {
      toast.error('No se pudo ajustar ningún producto. Revisa tu conexión e intenta de nuevo.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajuste masivo de inventario</DialogTitle>
          <DialogDescription>
            Edita la cantidad en stock de los {items.length} producto(s) seleccionados. Cada cambio queda
            registrado como un movimiento de inventario con la razón indicada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bulk-adjust-reason">Razón del ajuste</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="bulk-adjust-reason" className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border max-h-[45vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="w-[80px] text-right">Actual</TableHead>
                  <TableHead className="w-[120px]">Nueva cantidad</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const failed = failedIds.has(item._id);
                  const raw = quantities[item._id];
                  const changed = raw !== undefined && raw !== '' && Number(raw) !== (item.currentQty ?? 0) && !Number.isNaN(Number(raw)) && Number(raw) >= 0;
                  return (
                    <TableRow key={item._id} className={failed ? 'bg-destructive/10' : undefined}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {failed && <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                          {!failed && changed && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                          <div className="min-w-0">
                            <div className="font-medium truncate">{item.productName}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {item.productSku}
                              {item.variantSku && item.variantSku !== item.productSku ? ` · ${item.variantSku}` : ''}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {item.currentQty ?? 0}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={raw ?? ''}
                          onChange={(e) => handleQtyChange(item._id, e.target.value)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => onRemoveItem?.(item._id)}
                          title="Quitar de la selección"
                          disabled={saving}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={saving || hasInvalid || edits.length === 0}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Ajustando...
              </>
            ) : (
              `Ajustar ${edits.length} producto(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BulkAdjustDialog;
