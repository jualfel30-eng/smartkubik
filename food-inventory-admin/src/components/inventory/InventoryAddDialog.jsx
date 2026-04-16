/**
 * InventoryAddDialog.jsx
 *
 * Dialog for adding new inventory items in batch.
 * Includes product search, variant selection sub-dialog,
 * and a table for managing items to add.
 */
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { SearchableSelect } from '@/components/orders/v2/custom/SearchableSelect';
import { Plus, Trash2, Loader2 } from 'lucide-react';

export function InventoryAddDialog({
  isAddDialogOpen,
  setIsAddDialogOpen,
  newInventoryItem,
  setNewInventoryItem,
  multiWarehouseEnabled,
  warehouses,
  binLocations,
  loadProductOptions,
  handleProductSelection,
  variantSelection,
  closeVariantSelection,
  confirmVariantSelection,
  setVariantSelection,
  itemsToAdd,
  updateItemInList,
  removeItemFromList,
  updateItemLot,
  handleSaveBatch,
  loading,
}) {
  return (
    <>
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogTrigger asChild>
          <Button id="add-inventory-button" size="lg" className="bg-[#FB923C] hover:bg-[#F97316] text-white w-full sm:w-auto"><Plus className="h-5 w-5 mr-2" />Agregar Inventario</Button>
        </DialogTrigger>
        <DialogContent className="max-w-5xl h-[95vh] md:h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Agregar Inventario</DialogTitle>
            <DialogDescription>Agrega múltiples productos al inventario en una sola operación.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">

            {/* Global Configuration for Batch */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
              {multiWarehouseEnabled && (
                <div className="space-y-2">
                  <Label>Almacén de Destino</Label>
                  <Select
                    value={newInventoryItem.warehouseId}
                    onValueChange={(v) => setNewInventoryItem({ ...newInventoryItem, warehouseId: v, binLocationId: '' })}
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-950">
                      <SelectValue placeholder="Seleccionar almacén" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((wh) => (
                        <SelectItem key={wh._id || wh.id} value={wh._id || wh.id}>
                          {wh.code} · {wh.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {multiWarehouseEnabled && newInventoryItem.warehouseId && (
                <div className="space-y-2">
                  <Label>Ubicación Predeterminada</Label>
                  <Select
                    value={newInventoryItem.binLocationId}
                    onValueChange={(v) => setNewInventoryItem({ ...newInventoryItem, binLocationId: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-950">
                      <SelectValue placeholder="Sin ubicación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin ubicación</SelectItem>
                      {binLocations
                        .filter(b => b.warehouseId === newInventoryItem.warehouseId)
                        .map((bin) => (
                          <SelectItem key={bin._id || bin.id} value={bin._id || bin.id}>
                            {bin.code} - {bin.zone || 'N/A'}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Recibido Por</Label>
                <Input
                  placeholder="Nombre del responsable"
                  value={newInventoryItem.receivedBy}
                  onChange={(e) => setNewInventoryItem({ ...newInventoryItem, receivedBy: e.target.value })}
                  className="bg-white dark:bg-slate-950"
                />
              </div>
              <div className="space-y-2 col-span-1 md:col-span-3">
                <Label>Notas del Lote</Label>
                <Input
                  placeholder="Observaciones generales para todos los ítems..."
                  value={newInventoryItem.notes}
                  onChange={(e) => setNewInventoryItem({ ...newInventoryItem, notes: e.target.value })}
                  className="bg-white dark:bg-slate-950"
                />
              </div>
            </div>

            {/* Product Search */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Buscar Productos</Label>
              <SearchableSelect
                asyncSearch={true}
                loadOptions={loadProductOptions}
                minSearchLength={2}
                debounceMs={300}
                onSelection={handleProductSelection}
                value={null}
                placeholder="Escribe para buscar producto por nombre o SKU..."
                className="w-full"
              />
            </div>

            {/* Items Table */}
            <div className="border rounded-md min-h-[350px] bg-white dark:bg-slate-950">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100 dark:bg-slate-800">
                    <TableHead className="w-[300px]">Producto / Variante</TableHead>
                    <TableHead className="w-[120px]">Cantidad</TableHead>
                    <TableHead className="w-[120px]">Costo Unit.</TableHead>
                    <TableHead className="w-[200px]">Lote / Vencimiento</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsToAdd.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No haz agregado productos aún. Usa el buscador arriba.
                      </TableCell>
                    </TableRow>
                  ) : (
                    itemsToAdd.map((item, index) => (
                      <TableRow key={`${item.productId}-${item.variantId || 'base'}-${index}`}>
                        <TableCell>
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.productSku}
                            {item.variantName ? ` · ${item.variantName}` : ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => updateItemInList(index, 'quantity', e.target.value)}
                            className="h-8 w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.costPrice}
                            onChange={(e) => updateItemInList(index, 'costPrice', e.target.value)}
                            className="h-8 w-full"
                          />
                        </TableCell>
                        <TableCell>
                          {item.isPerishable ? (
                            <div className="flex flex-col gap-2">
                              <Input
                                placeholder="Nro. Lote"
                                value={item.lots?.[0]?.lotNumber || ''}
                                onChange={(e) => updateItemLot(index, 0, 'lotNumber', e.target.value)}
                                className="h-8 w-full"
                              />
                              <Input
                                type="date"
                                value={item.lots?.[0]?.expirationDate || ''}
                                onChange={(e) => updateItemLot(index, 0, 'expirationDate', e.target.value)}
                                className="h-8 w-full"
                              />
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => removeItemFromList(index)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/5">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

          </div>

          <DialogFooter className="p-4 border-t bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-muted-foreground">
                Total productos: <span className="font-medium text-foreground">{itemsToAdd.length}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveBatch} disabled={itemsToAdd.length === 0 || loading} className="bg-[#FB923C] hover:bg-[#F97316] text-white">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Guardar Todo
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variant Selection Dialog */}
      <Dialog open={!!variantSelection} onOpenChange={(open) => !open && closeVariantSelection()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Seleccionar Variantes</DialogTitle>
            <DialogDescription>
              Ingresa la cantidad para cada variante de {variantSelection?.product?.name} que deseas agregar.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variante</TableHead>
                  <TableHead className="w-[100px]">Cantidad</TableHead>
                  <TableHead className="w-[120px]">Costo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variantSelection?.rows.map((row, idx) => (
                  <TableRow key={row.variant._id || idx}>
                    <TableCell>
                      <div className="font-medium">{row.variant.name || row.variant.sku}</div>
                      <div className="text-xs text-muted-foreground">{row.variant.sku}</div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={row.quantity}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          setVariantSelection(prev => {
                            if (!prev) return prev;
                            const newRows = [...prev.rows];
                            newRows[idx] = { ...newRows[idx], quantity: newVal };
                            return { ...prev, rows: newRows };
                          });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={row.cost}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          setVariantSelection(prev => {
                            if (!prev) return prev;
                            const newRows = [...prev.rows];
                            newRows[idx] = { ...newRows[idx], cost: newVal };
                            return { ...prev, rows: newRows };
                          });
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeVariantSelection}>Cancelar</Button>
            <Button onClick={confirmVariantSelection}>Agregar Seleccionados</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
