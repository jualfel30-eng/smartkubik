/**
 * InventoryLotsDialog.jsx
 *
 * Dialog for viewing and editing lots associated with an inventory item.
 * Includes inline editing for lot details (number, quantity, cost, dates).
 */
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { NumberInput } from '@/components/ui/number-input.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Edit } from 'lucide-react';

export function InventoryLotsDialog({
  isLotsDialogOpen,
  setIsLotsDialogOpen,
  selectedInventoryForLots,
  editingLotIndex,
  editingLotData,
  setEditingLotData,
  handleStartEditLot,
  handleCancelEditLot,
  handleSaveLot,
}) {
  return (
    <Dialog open={isLotsDialogOpen} onOpenChange={setIsLotsDialogOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Lotes del Producto</DialogTitle>
          <DialogDescription>
            {selectedInventoryForLots && (
              <div className="mt-2">
                <div className="font-semibold text-lg">{selectedInventoryForLots.productName}</div>
                <div className="text-sm text-muted-foreground">
                  SKU: {selectedInventoryForLots.productSku} | Total en inventario: {selectedInventoryForLots.availableQuantity} unidades
                </div>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {selectedInventoryForLots?.lots && selectedInventoryForLots.lots.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nro. Lote</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Costo Unitario</TableHead>
                  <TableHead>Fecha de Vencimiento</TableHead>
                  <TableHead>Fecha de Fabricación</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedInventoryForLots.lots.map((lot, index) => {
                  const expirationDate = lot.expirationDate ? new Date(lot.expirationDate) : null;
                  const manufacturingDate = lot.manufacturingDate ? new Date(lot.manufacturingDate) : null;
                  const today = new Date();
                  const daysUntilExpiry = expirationDate ? Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24)) : null;

                  let statusBadge = null;
                  if (daysUntilExpiry !== null) {
                    if (daysUntilExpiry < 0) {
                      statusBadge = <Badge variant="destructive">Vencido</Badge>;
                    } else if (daysUntilExpiry <= 7) {
                      statusBadge = <Badge variant="destructive">Vence en {daysUntilExpiry}d</Badge>;
                    } else if (daysUntilExpiry <= 30) {
                      statusBadge = <Badge className="bg-yellow-500 hover:bg-yellow-600">Vence en {daysUntilExpiry}d</Badge>;
                    } else {
                      statusBadge = <Badge variant="outline">OK</Badge>;
                    }
                  }

                  const isEditing = editingLotIndex === index;

                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {isEditing ? (
                          <Input
                            value={editingLotData?.lotNumber || ''}
                            onChange={(e) => setEditingLotData({ ...editingLotData, lotNumber: e.target.value })}
                            className="w-full"
                          />
                        ) : (
                          lot.lotNumber || 'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <NumberInput
                            value={editingLotData?.quantity ?? ''}
                            onValueChange={(val) => setEditingLotData({ ...editingLotData, quantity: val })}
                            className="w-24"
                            min={0}
                          />
                        ) : (
                          `${lot.quantity || 0} unidades`
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <NumberInput
                            step={0.01}
                            value={editingLotData?.costPrice ?? ''}
                            onValueChange={(val) => setEditingLotData({ ...editingLotData, costPrice: val })}
                            className="w-24"
                            min={0}
                          />
                        ) : (
                          `$${(lot.costPrice || 0).toFixed(2)}`
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editingLotData?.expirationDate || ''}
                            onChange={(e) => setEditingLotData({ ...editingLotData, expirationDate: e.target.value })}
                            className="w-40"
                          />
                        ) : (
                          expirationDate ? expirationDate.toLocaleDateString() : 'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editingLotData?.manufacturingDate || ''}
                            onChange={(e) => setEditingLotData({ ...editingLotData, manufacturingDate: e.target.value })}
                            className="w-40"
                          />
                        ) : (
                          manufacturingDate ? manufacturingDate.toLocaleDateString() : 'N/A'
                        )}
                      </TableCell>
                      <TableCell>{statusBadge}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex space-x-1">
                            <Button size="sm" onClick={handleSaveLot} variant="default">
                              Guardar
                            </Button>
                            <Button size="sm" onClick={handleCancelEditLot} variant="outline">
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEditLot(index, lot)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay lotes registrados para este producto
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsLotsDialogOpen(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
