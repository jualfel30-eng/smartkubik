/**
 * InventoryEditDialog.jsx
 *
 * Dialog for adjusting an existing inventory item's quantity.
 * Creates an adjustment movement in the system.
 *
 * Para productos con unidades de venta múltiples (ej: base "Saco", unidad "Kg"),
 * el usuario elige la unidad en la que quiere razonar. El input muestra y edita
 * en esa unidad; el valor se convierte a unidad base antes de guardar
 * (newQuantity siempre va en base). Ver lib/inventoryUnits.js.
 */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { NumberInput } from '@/components/ui/number-input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import {
  allowsFractionalStock,
  getUnitOptions,
  defaultUnitKey,
  findUnitOption,
  hasUnitChoices,
  toBaseUnit,
  fromBaseUnit,
} from '@/lib/inventoryUnits.js';

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
  const options = getUnitOptions(selectedItem);
  const showUnitSelector = hasUnitChoices(selectedItem);
  const [unitKey, setUnitKey] = useState(() => defaultUnitKey(selectedItem));
  // Valor visible en el input, expresado en la unidad seleccionada.
  const [displayQty, setDisplayQty] = useState('');

  const unit = findUnitOption(selectedItem, unitKey);
  const factor = unit.conversionFactor;
  const currentBase = Number(selectedItem?.totalQuantity ?? selectedItem?.availableQuantity ?? 0);
  // Con unidades de venta o stock fraccionario siempre permitimos decimales.
  const allowDecimals = showUnitSelector || allowsFractionalStock(selectedItem);

  // Al abrir el dialog (o cambiar de item) reseteamos la unidad por defecto y
  // prellenamos el input con el stock actual convertido a esa unidad.
  useEffect(() => {
    if (!isEditDialogOpen || !selectedItem) return;
    const key = defaultUnitKey(selectedItem);
    const opt = findUnitOption(selectedItem, key);
    const display = fromBaseUnit(currentBase, opt.conversionFactor);
    setUnitKey(key);
    setDisplayQty(display);
    setEditFormData((prev) => ({
      ...prev,
      newQuantity: currentBase,
      unitNote: opt.isBase ? '' : `${display} ${opt.label}`,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditDialogOpen, selectedItem?._id]);

  const handleQtyChange = (val) => {
    const qty = val ?? 0;
    setDisplayQty(val);
    setEditFormData((prev) => ({
      ...prev,
      newQuantity: toBaseUnit(qty, factor),
      unitNote: unit.isBase ? '' : `${qty} ${unit.label}`,
    }));
  };

  const handleUnitChange = (key) => {
    const opt = findUnitOption(selectedItem, key);
    // Mantenemos la cantidad base; solo cambia cómo se muestra.
    const display = fromBaseUnit(Number(editFormData.newQuantity ?? currentBase), opt.conversionFactor);
    setUnitKey(key);
    setDisplayQty(display);
    setEditFormData((prev) => ({
      ...prev,
      unitNote: opt.isBase ? '' : `${display} ${opt.label}`,
    }));
  };

  const currentInUnit = fromBaseUnit(currentBase, factor);

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
          {showUnitSelector && (
            <div className="space-y-2">
              <Label htmlFor="adjustUnit">Unidad del ajuste</Label>
              <Select value={unitKey} onValueChange={handleUnitChange}>
                <SelectTrigger id="adjustUnit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((o) => (
                    <SelectItem key={o.key} value={o.key}>
                      {o.label}{o.isBase ? ' (base)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Cantidad Actual (Total){unit.label ? ` · ${unit.label}` : ''}</Label>
            <Input value={currentInUnit} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newQuantity">
              Nueva Cantidad Total{unit.label ? ` (${unit.label})` : ''}
            </Label>
            <NumberInput
              id="newQuantity"
              value={displayQty ?? ''}
              onValueChange={handleQtyChange}
              min={0}
              step={allowDecimals ? 0.001 : 1}
              placeholder="Nueva cantidad"
            />
            {showUnitSelector && !unit.isBase && (
              <p className="text-xs text-muted-foreground">
                Se guardará como {toBaseUnit(displayQty || 0, factor)} {options[0].label} (unidad base).
              </p>
            )}
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
