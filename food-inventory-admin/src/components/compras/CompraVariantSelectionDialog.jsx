/**
 * @file CompraVariantSelectionDialog.jsx
 * Dialog for selecting quantities per variant when adding a multi-variant
 * product to a purchase order.
 */
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';

export default function CompraVariantSelectionDialog({
  variantSelection,
  closeVariantSelection,
  updateVariantSelectionRow,
  confirmVariantSelection,
}) {
  return (
    <Dialog open={Boolean(variantSelection)} onOpenChange={(open) => { if (!open) closeVariantSelection(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Seleccionar variantes</DialogTitle>
          <DialogDescription>
            Define las cantidades por variante para {variantSelection?.product?.name || 'el producto seleccionado'}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {variantSelection?.rows?.map((row, index) => {
            const variantId = row.variant?._id || `variant-${index}`;
            return (
              <div key={variantId} className="border rounded-lg p-4 space-y-3">
                <div>
                  <div className="font-medium">{row.variant?.name}</div>
                  <div className="text-xs text-muted-foreground">{row.variant?.sku}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`variant-qty-${variantId}`}>Cantidad</Label>
                    <Input
                      id={`variant-qty-${variantId}`}
                      type="number"
                      min="0"
                      value={row.quantity}
                      onChange={(e) => updateVariantSelectionRow(index, 'quantity', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`variant-cost-${variantId}`}>Costo unitario</Label>
                    <Input
                      id={`variant-cost-${variantId}`}
                      type="number"
                      min="0"
                      value={row.costPrice}
                      onChange={(e) => updateVariantSelectionRow(index, 'costPrice', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {!variantSelection?.rows?.length && (
            <p className="text-sm text-muted-foreground">
              No hay variantes disponibles para este producto.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeVariantSelection}>Cancelar</Button>
          <Button onClick={confirmVariantSelection}>Agregar a la orden</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
