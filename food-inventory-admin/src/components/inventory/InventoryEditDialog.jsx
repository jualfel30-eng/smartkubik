/**
 * InventoryEditDialog.jsx
 *
 * Dialog for adjusting an existing inventory item's quantity.
 * Creates an adjustment movement in the system.
 */
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { NumberInput } from '@/components/ui/number-input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';

export function InventoryEditDialog({
  isEditDialogOpen,
  setIsEditDialogOpen,
  selectedItem,
  editFormData,
  setEditFormData,
  handleUpdateItem,
  multiWarehouseEnabled,
  editBinOptions,
}) {
  return (
    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajustar Inventario: {selectedItem?.productName}</DialogTitle>
          <DialogDescription>
            Modifica la cantidad de stock. Esto creará un movimiento de ajuste.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Producto</Label>
            <Input value={`${selectedItem?.productName} (${selectedItem?.productSku})`} disabled />
          </div>
          <div className="space-y-2">
            <Label>Cantidad Actual (Disponible)</Label>
            <Input value={selectedItem?.availableQuantity} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newQuantity">Nueva Cantidad Total</Label>
            <NumberInput
              id="newQuantity"
              value={editFormData.newQuantity ?? ''}
              onValueChange={(val) => setEditFormData({ ...editFormData, newQuantity: val })}
              min={0}
              placeholder="Nueva cantidad"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Razón del Ajuste</Label>
            <Input
              id="reason"
              value={editFormData.reason}
              onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
              placeholder="Ej: Conteo físico, corrección de error, etc."
            />
          </div>
          {/* Bin location selector - only show when bins exist for the inventory's warehouse */}
          {multiWarehouseEnabled && editBinOptions.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="binLocation">Ubicación (opcional)</Label>
              <Select
                value={editFormData.binLocationId || 'none'}
                onValueChange={(v) => setEditFormData({ ...editFormData, binLocationId: v === 'none' ? '' : v })}
              >
                <SelectTrigger id="binLocation">
                  <SelectValue placeholder="Seleccionar ubicación..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  {editBinOptions.map((bin) => (
                    <SelectItem key={bin._id || bin.id} value={bin._id || bin.id}>
                      {bin.code} {bin.zone ? `· ${bin.zone}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleUpdateItem}>Guardar Ajuste</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
