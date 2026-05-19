import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Copy, Check, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';
import { toast } from 'sonner';

function buildMsg(row) {
  return `Hola ${row.customerName}, le recordamos que tiene un saldo pendiente de ${formatCurrency(Number(row.balance))} correspondiente al pedido N° ${row.orderNumber}. Agradecemos su pronto pago. Gracias.`;
}

export default function ARBulkReminderModal({ open, onClose, receivables = [] }) {
  const [copied, setCopied] = useState(false);

  const withPhone    = useMemo(() => receivables.filter(r => r.customerPhone), [receivables]);
  const withoutPhone = useMemo(() => receivables.filter(r => !r.customerPhone), [receivables]);

  const handleOpenAll = () => {
    withPhone.forEach((row, i) => {
      setTimeout(() => {
        const msg = buildMsg(row);
        const phone = row.customerPhone.replace(/\D/g, '');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
      }, i * 350);
    });
  };

  const handleCopyAll = async () => {
    const text = receivables.map(r => `${r.customerName}: ${buildMsg(r)}`).join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Mensajes copiados al portapapeles');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Recordatorio a {receivables.length} {receivables.length === 1 ? 'cliente' : 'clientes'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {withPhone.map(row => (
            <div key={row.orderNumber} className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5">
              <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{row.customerName}</p>
                <p className="text-xs text-muted-foreground truncate">{row.customerPhone}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{buildMsg(row)}</p>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">{formatCurrency(Number(row.balance))}</Badge>
            </div>
          ))}

          {withoutPhone.map(row => (
            <div key={row.orderNumber} className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{row.customerName}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">Sin teléfono registrado</p>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">{formatCurrency(Number(row.balance))}</Badge>
            </div>
          ))}
        </div>

        {withoutPhone.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {withoutPhone.length} {withoutPhone.length === 1 ? 'cliente no tiene' : 'clientes no tienen'} teléfono y no {withoutPhone.length === 1 ? 'recibirá' : 'recibirán'} recordatorio por WhatsApp.
          </p>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="gap-2 flex-1"
            onClick={handleCopyAll}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Copiar mensajes
          </Button>
          {withPhone.length > 0 && (
            <Button
              className="gap-2 flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleOpenAll}
            >
              <MessageSquare className="h-4 w-4" />
              WhatsApp ({withPhone.length})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
