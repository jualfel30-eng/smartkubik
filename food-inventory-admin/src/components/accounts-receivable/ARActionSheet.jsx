import { CreditCard, Link2, MessageSquare } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency-utils';
import { getDaysLabel } from '@/lib/invoice-constants';
import { cn } from '@/lib/utils';

export default function ARActionSheet({ open, onClose, receivable, onRegisterPayment, onSendPaymentLink, canSendPaymentLink = true }) {
  if (!receivable) return null;

  const daysLabel = getDaysLabel(receivable.dueDate);
  const balance = Number(receivable.balance) || 0;

  const handleWhatsApp = () => {
    const msg = `Hola ${receivable.customerName}, le recordamos que tiene un saldo pendiente de ${formatCurrency(balance)} correspondiente al pedido N° ${receivable.orderNumber}. Agradecemos su pronto pago. Gracias.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-8 max-w-lg mx-auto">
        <SheetHeader className="px-6 pb-4 border-b border-border">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Gestionar cobro</p>
          <SheetTitle className="text-left text-lg font-bold leading-tight">
            {receivable.customerName}
          </SheetTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl font-bold text-foreground">{formatCurrency(balance)}</span>
            <span className="text-sm text-muted-foreground">· Orden #{receivable.orderNumber}</span>
          </div>
          {daysLabel && (
            <p className={cn('text-xs font-medium', daysLabel.className)}>{daysLabel.text}</p>
          )}
        </SheetHeader>

        <div className="px-6 pt-5 space-y-3">
          {/* Primary: Register payment */}
          <Button
            size="lg"
            className="w-full h-14 gap-3 text-base font-semibold"
            onClick={() => { onClose(); onRegisterPayment(receivable); }}
          >
            <CreditCard className="h-5 w-5" />
            Registrar cobro ahora
          </Button>

          {/* Primary: Send payment link */}
          {canSendPaymentLink && (
            <Button
              size="lg"
              variant="outline"
              className="w-full h-14 gap-3 text-base font-semibold"
              onClick={() => { onClose(); onSendPaymentLink(receivable); }}
            >
              <Link2 className="h-5 w-5" />
              Enviar link de pago
            </Button>
          )}

          {/* Ghost: WhatsApp reminder */}
          <Button
            variant="ghost"
            className="w-full h-11 gap-2 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-500/8"
            onClick={handleWhatsApp}
          >
            <MessageSquare className="h-4 w-4" />
            Recordatorio por WhatsApp
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
