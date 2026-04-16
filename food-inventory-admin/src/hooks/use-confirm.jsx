import { useState, useCallback, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * useConfirm — Drop-in replacement for window.confirm() with a polished AlertDialog.
 *
 * Usage:
 *   const [ConfirmDialog, confirm] = useConfirm();
 *
 *   const handleDelete = async () => {
 *     const ok = await confirm({
 *       title: '¿Eliminar producto?',
 *       description: 'Esta acción no se puede deshacer.',
 *       destructive: true,
 *     });
 *     if (!ok) return;
 *     // proceed...
 *   };
 *
 *   return <>{...}<ConfirmDialog /></>;
 */
export function useConfirm() {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback(({
    title = '¿Estás seguro?',
    description = '',
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    destructive = false,
  } = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ title, description, confirmLabel, cancelLabel, destructive });
    });
  }, []);

  const handleResponse = useCallback((value) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setState(null);
  }, []);

  const ConfirmDialog = useCallback(() => {
    if (!state) return null;
    return (
      <AlertDialog open onOpenChange={(open) => { if (!open) handleResponse(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{state.title}</AlertDialogTitle>
            {state.description && (
              <AlertDialogDescription>{state.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleResponse(false)}>
              {state.cancelLabel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleResponse(true)}
              className={state.destructive ? 'bg-destructive text-white hover:bg-destructive/90' : ''}
            >
              {state.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }, [state, handleResponse]);

  return [ConfirmDialog, confirm];
}
