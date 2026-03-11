import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
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
import { Textarea } from '@/components/ui/textarea.jsx';
import { ChevronDown, ChevronRight, RotateCcw, Loader2 } from 'lucide-react';
import { reverseMergeJob } from '@/lib/api.js';
import { toast } from 'sonner';

const STATUS_STYLES = {
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  reversed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

const STATUS_LABELS = {
  completed: 'Completado',
  reversed: 'Revertido',
  failed: 'Fallido',
  pending: 'Pendiente',
  in_progress: 'En progreso',
};

export default function MergeJobDetail({ job, onReversed }) {
  const [expanded, setExpanded] = useState(false);
  const [showReverseDialog, setShowReverseDialog] = useState(false);
  const [reverseReason, setReverseReason] = useState('');
  const [reversing, setReversing] = useState(false);

  const canReverse =
    job.status === 'completed' &&
    job.canReverse !== false &&
    new Date(job.reverseDeadline) > new Date();

  const daysLeft = job.reverseDeadline
    ? Math.max(0, Math.ceil((new Date(job.reverseDeadline) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleReverse = async () => {
    setReversing(true);
    try {
      await reverseMergeJob(job._id, { reason: reverseReason });
      toast.success('Fusión revertida exitosamente');
      setShowReverseDialog(false);
      onReversed?.();
    } catch (err) {
      toast.error(err.message || 'Error al revertir la fusión');
    } finally {
      setReversing(false);
    }
  };

  const reassignments = job.reassignments || {};

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => setExpanded(!expanded)}
            >
              <div className="flex items-center gap-2">
                {expanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                )}
                <span className="text-sm font-mono font-medium">{job.jobNumber}</span>
                <Badge variant="outline" className={STATUS_STYLES[job.status] || ''}>
                  {STATUS_LABELS[job.status] || job.status}
                </Badge>
              </div>
              <div className="ml-6 mt-1 space-y-0.5">
                <p className="text-sm">
                  <span className="text-muted-foreground">Maestro: </span>
                  <span className="font-medium">{job.masterProductName}</span>
                  <span className="text-muted-foreground ml-1">({job.masterProductSku})</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {job.duplicateProductIds?.length || 0} producto(s) fusionados |{' '}
                  {new Date(job.createdAt).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            {canReverse && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowReverseDialog(true)}
                className="shrink-0"
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                Revertir ({daysLeft}d)
              </Button>
            )}
          </div>

          {/* Expanded details */}
          {expanded && (
            <div className="ml-6 mt-4 space-y-3 border-t pt-3">
              {/* Reassignment summary */}
              {Object.keys(reassignments).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Reasignaciones:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {reassignments.inventoryRecords > 0 && (
                      <span>{reassignments.inventoryRecords} registros de inventario</span>
                    )}
                    {reassignments.inventoryMovements > 0 && (
                      <span>{reassignments.inventoryMovements} movimientos</span>
                    )}
                    {reassignments.orderItems > 0 && (
                      <span>{reassignments.orderItems} items de órdenes</span>
                    )}
                    {reassignments.purchaseOrderItems > 0 && (
                      <span>{reassignments.purchaseOrderItems} items de compras</span>
                    )}
                    {reassignments.transferOrderItems > 0 && (
                      <span>{reassignments.transferOrderItems} items de transferencias</span>
                    )}
                    {reassignments.priceLists > 0 && (
                      <span>{reassignments.priceLists} listas de precios</span>
                    )}
                    {reassignments.billsOfMaterials > 0 && (
                      <span>{reassignments.billsOfMaterials} recetas</span>
                    )}
                  </div>
                </div>
              )}

              {/* Merge details */}
              {job.mergeDetails && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Detalles:</p>
                  <div className="text-xs space-y-0.5">
                    {job.mergeDetails.fieldsFromMaster?.length > 0 && (
                      <p>Campos del maestro: {job.mergeDetails.fieldsFromMaster.join(', ')}</p>
                    )}
                    {job.mergeDetails.fieldsFromDuplicates?.length > 0 && (
                      <p>Campos del duplicado: {job.mergeDetails.fieldsFromDuplicates.join(', ')}</p>
                    )}
                    {job.mergeDetails.conflictsResolved?.length > 0 && (
                      <p>Conflictos resueltos: {job.mergeDetails.conflictsResolved.length}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {job.notes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notas:</p>
                  <p className="text-xs">{job.notes}</p>
                </div>
              )}

              {/* Reversal info */}
              {job.status === 'reversed' && job.reversedAt && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                  <p className="text-xs text-muted-foreground">
                    Revertido el{' '}
                    {new Date(job.reversedAt).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {job.reverseReason && ` — Razón: ${job.reverseReason}`}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reverse confirmation dialog */}
      <AlertDialog open={showReverseDialog} onOpenChange={setShowReverseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revertir Fusión</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Se revertirá la fusión <strong>{job.jobNumber}</strong> y se restaurarán todos
                  los productos a su estado previo.
                </p>
                <div>
                  <Textarea
                    value={reverseReason}
                    onChange={(e) => setReverseReason(e.target.value)}
                    placeholder="Razón para revertir (opcional)..."
                    rows={2}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reversing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReverse} disabled={reversing}>
              {reversing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revirtiendo...
                </>
              ) : (
                'Confirmar Reversión'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
