/**
 * InventoryImportDialog.jsx
 *
 * Dialog for previewing imported data before confirming bulk adjustments.
 */
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';

export function InventoryImportDialog({
  isPreviewDialogOpen,
  setIsPreviewDialogOpen,
  previewData,
  previewHeaders,
  importReason,
  setImportReason,
  handleConfirmImport,
}) {
  return (
    <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Previsualización de Importación</DialogTitle>
          <DialogDescription>
            Se encontraron {previewData.length} registros para actualizar. Revisa los datos antes de confirmar.
            Las columnas requeridas son 'SKU' y 'NuevaCantidad'.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {previewHeaders.map(header => <TableHead key={header}>{header}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewData.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {previewHeaders.map(header => <TableCell key={`${rowIndex}-${header}`}>{String(row[header])}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4">
          <Label htmlFor="importReason">Razón del Ajuste Masivo</Label>
          <Input
            id="importReason"
            value={importReason}
            onChange={(e) => setImportReason(e.target.value)}
            placeholder="Ej: Conteo físico anual, corrección de sistema, etc."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirmImport}>Confirmar Importación</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
