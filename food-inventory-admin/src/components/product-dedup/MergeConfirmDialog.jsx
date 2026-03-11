import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.jsx';
import { Loader2 } from 'lucide-react';

export default function MergeConfirmDialog({
  open,
  onOpenChange,
  masterProduct,
  duplicateCount,
  reassignmentPreview,
  onConfirm,
  loading,
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Fusion de Productos</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Se fusionaran <strong>{duplicateCount} producto(s)</strong> en el producto maestro:
              </p>
              <div className="rounded-md bg-muted p-3">
                <p className="font-medium">{masterProduct?.name}</p>
                <p className="text-sm text-muted-foreground">SKU: {masterProduct?.sku}</p>
              </div>
              {reassignmentPreview && (
                <div className="text-sm space-y-1">
                  <p className="font-medium">Se reasignaran:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {reassignmentPreview.inventoryRecords > 0 && (
                      <li>{reassignmentPreview.inventoryRecords} registro(s) de inventario</li>
                    )}
                    {reassignmentPreview.orderItems > 0 && (
                      <li>{reassignmentPreview.orderItems} item(s) de ordenes</li>
                    )}
                    {reassignmentPreview.purchaseOrderItems > 0 && (
                      <li>{reassignmentPreview.purchaseOrderItems} item(s) de compras</li>
                    )}
                  </ul>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Esta accion puede revertirse dentro de 7 dias.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fusionando...
              </>
            ) : (
              'Fusionar'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
