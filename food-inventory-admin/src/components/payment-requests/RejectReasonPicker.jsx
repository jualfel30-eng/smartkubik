import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Image as ImageIcon, MinusCircle, ShieldX } from 'lucide-react';

/**
 * Reject reason picker — surfaces the typology from PR1's spec instead of a
 * generic "rejected". Each option drives:
 *   - The PaymentRequest's resulting status (info_mismatch, proof_unclear,
 *     partial, rejected_final)
 *   - A different WhatsApp message tone sent to the customer
 *   - A different portal re-entry experience
 *
 * The dialog is intentionally short. The cashier reaches it from the
 * detail view's "Pedir corrección" button — language matters: we're asking
 * the customer to fix something, not refusing them.
 *
 * `rejected_final` is the only option that does NOT message the customer
 * back; it's reserved for fraud / returned funds and closes the PR.
 */
const REASONS = [
  {
    value: 'info_mismatch',
    title: 'Datos no coinciden',
    blurb: 'La cédula, banco o teléfono no coincide con el comprobante.',
    icon: AlertTriangle,
    tone: 'amber',
  },
  {
    value: 'proof_unclear',
    title: 'Comprobante ilegible',
    blurb: 'La imagen no se ve bien. Le pediré una nueva foto.',
    icon: ImageIcon,
    tone: 'amber',
  },
  {
    value: 'partial',
    title: 'Monto incompleto',
    blurb: 'Pagó menos de lo debido. Le pediré completar el monto.',
    icon: MinusCircle,
    tone: 'amber',
  },
  {
    value: 'rejected_final',
    title: 'Sospecha de fraude',
    blurb: 'Cerrar definitivamente. El cliente no podrá reabrir esta solicitud.',
    icon: ShieldX,
    tone: 'rose',
  },
];

export function RejectReasonPicker({ open, onOpenChange, onSubmit, busy }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  // Reset when the dialog opens — never carry state across separate reviews.
  useEffect(() => {
    if (open) {
      setReason('');
      setNote('');
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!reason || busy) return;
    await onSubmit({ reason, note: note.trim() || undefined });
  };

  const selectedTone = REASONS.find((r) => r.value === reason)?.tone;
  const submitLabel =
    reason === 'rejected_final' ? 'Cerrar solicitud' : 'Pedir corrección';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>¿Qué pasó con este pago?</DialogTitle>
          <DialogDescription>
            Le enviaremos un mensaje al cliente con la razón. Elige la que
            mejor describa el problema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <RadioGroup value={reason} onValueChange={setReason} className="gap-2">
            {REASONS.map((r) => {
              const Icon = r.icon;
              const checked = reason === r.value;
              return (
                <Label
                  key={r.value}
                  htmlFor={`reject-${r.value}`}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    checked
                      ? r.tone === 'rose'
                        ? 'border-rose-400/60 bg-rose-400/[0.07]'
                        : 'border-amber-400/60 bg-amber-400/[0.07]'
                      : 'border-border hover:bg-accent/40'
                  }`}
                >
                  <RadioGroupItem
                    id={`reject-${r.value}`}
                    value={r.value}
                    className="mt-1"
                  />
                  <Icon
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      r.tone === 'rose' ? 'text-rose-400' : 'text-amber-400'
                    }`}
                    aria-hidden
                  />
                  <div className="flex-1 text-sm">
                    <p className="font-medium leading-tight">{r.title}</p>
                    <p className="text-muted-foreground">{r.blurb}</p>
                  </div>
                </Label>
              );
            })}
          </RadioGroup>

          <div className="space-y-1.5">
            <Label htmlFor="reject-note" className="text-xs uppercase tracking-wide text-muted-foreground">
              Nota para el cliente (opcional)
            </Label>
            <Textarea
              id="reject-note"
              placeholder="Ej: La cédula del titular no coincide con la del titular de la cuenta."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[72px] resize-none"
              maxLength={500}
            />
            <p className="text-[11px] text-muted-foreground">
              Se enviará por WhatsApp junto con el enlace para corregir.
              {reason === 'rejected_final' &&
                ' En "Sospecha de fraude" la nota queda como registro interno (no se envía).'}
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!reason || busy}
              variant={selectedTone === 'rose' ? 'destructive' : 'default'}
            >
              {busy ? 'Enviando…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
