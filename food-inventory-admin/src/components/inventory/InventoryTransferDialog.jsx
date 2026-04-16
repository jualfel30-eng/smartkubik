/**
 * InventoryTransferDialog.jsx
 *
 * Dialog for transferring inventory between warehouses.
 * Generates linked outbound and inbound movements.
 */
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { NumberInput } from '@/components/ui/number-input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';

export function InventoryTransferDialog({
  isTransferDialogOpen,
  setIsTransferDialogOpen,
  transferForm,
  setTransferForm,
  transferLoading,
  handleSaveTransfer,
  warehouses,
  sourceBinOptions,
  destBinOptions,
}) {
  return (
    <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transferir Inventario</DialogTitle>
          <DialogDescription>
            Transfiere stock de un almacén a otro. Se generarán dos movimientos vinculados (salida y entrada).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Producto info */}
          <div className="space-y-2">
            <Label>Producto</Label>
            <Input
              value={`${transferForm.productName} (${transferForm.productSku})`}
              disabled
            />
          </div>

          {/* Stock disponible info */}
          <div className="p-3 bg-muted rounded-md">
            <span className="text-sm text-muted-foreground">Stock disponible: </span>
            <span className="font-semibold">{transferForm.availableQuantity} unidades</span>
          </div>

          {/* Almacén origen */}
          <div className="space-y-2">
            <Label htmlFor="sourceWarehouse">Almacén Origen *</Label>
            <Select
              value={transferForm.sourceWarehouseId || 'none'}
              onValueChange={(v) =>
                setTransferForm({
                  ...transferForm,
                  sourceWarehouseId: v === 'none' ? '' : v,
                  sourceBinLocationId: '',
                })
              }
            >
              <SelectTrigger id="sourceWarehouse">
                <SelectValue placeholder="Seleccionar almacén origen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Seleccionar...</SelectItem>
                {warehouses.map((wh) => (
                  <SelectItem key={wh._id || wh.id} value={wh._id || wh.id}>
                    {wh.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bin origen (opcional) */}
          {sourceBinOptions.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="sourceBin">Ubicación Origen (opcional)</Label>
              <Select
                value={transferForm.sourceBinLocationId || 'none'}
                onValueChange={(v) =>
                  setTransferForm({ ...transferForm, sourceBinLocationId: v === 'none' ? '' : v })
                }
              >
                <SelectTrigger id="sourceBin">
                  <SelectValue placeholder="Sin especificar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  {sourceBinOptions.map((bin) => (
                    <SelectItem key={bin._id || bin.id} value={bin._id || bin.id}>
                      {bin.code} {bin.zone ? `· ${bin.zone}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Almacén destino */}
          <div className="space-y-2">
            <Label htmlFor="destWarehouse">Almacén Destino *</Label>
            <Select
              value={transferForm.destinationWarehouseId || 'none'}
              onValueChange={(v) =>
                setTransferForm({
                  ...transferForm,
                  destinationWarehouseId: v === 'none' ? '' : v,
                  destinationBinLocationId: '',
                })
              }
            >
              <SelectTrigger id="destWarehouse">
                <SelectValue placeholder="Seleccionar almacén destino..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Seleccionar...</SelectItem>
                {warehouses
                  .filter((wh) => (wh._id || wh.id) !== transferForm.sourceWarehouseId)
                  .map((wh) => (
                    <SelectItem key={wh._id || wh.id} value={wh._id || wh.id}>
                      {wh.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bin destino (opcional) */}
          {destBinOptions.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="destBin">Ubicación Destino (opcional)</Label>
              <Select
                value={transferForm.destinationBinLocationId || 'none'}
                onValueChange={(v) =>
                  setTransferForm({ ...transferForm, destinationBinLocationId: v === 'none' ? '' : v })
                }
              >
                <SelectTrigger id="destBin">
                  <SelectValue placeholder="Sin especificar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  {destBinOptions.map((bin) => (
                    <SelectItem key={bin._id || bin.id} value={bin._id || bin.id}>
                      {bin.code} {bin.zone ? `· ${bin.zone}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Cantidad */}
          <div className="space-y-2">
            <Label htmlFor="transferQty">Cantidad a Transferir *</Label>
            <NumberInput
              id="transferQty"
              value={transferForm.quantity ?? ''}
              onValueChange={(val) => setTransferForm({ ...transferForm, quantity: val })}
              min={0.0001}
              max={transferForm.availableQuantity}
              placeholder="Cantidad"
            />
          </div>

          {/* Razón (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="transferReason">Razón (opcional)</Label>
            <Input
              id="transferReason"
              value={transferForm.reason}
              onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
              placeholder="Ej: Reabastecimiento sucursal, balance de stock, etc."
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsTransferDialogOpen(false)}
            disabled={transferLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSaveTransfer} disabled={transferLoading}>
            {transferLoading ? 'Procesando...' : 'Confirmar Transferencia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
