import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Printer, MessageSquare, X } from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';
import { mapPaymentMethodToName } from '@/lib/payment-methods';

export default function ARPaymentReceiptModal({ open, onClose, data }) {
  if (!data) return null;

  const { receivable, amount, method, reference, date } = data;
  const methodLabel = mapPaymentMethodToName?.(method) || method || '—';
  const dateLabel = date
    ? new Date(date).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString('es-VE');

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const phone = receivable.customerPhone?.replace(/\D/g, '') || '';
    const msg = `Hola ${receivable.customerName}, confirmamos recibo de ${formatCurrency(Number(amount))} correspondiente a la orden #${receivable.orderNumber}${reference ? ` (Ref: ${reference})` : ''} el ${dateLabel}. ¡Gracias por su pago!`;
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #ar-receipt-print { display: block !important; }
        }
        #ar-receipt-print { display: none; }
      `}</style>

      {/* Printable copy (hidden until print) */}
      <div id="ar-receipt-print" className="p-8 font-sans text-black">
        <h1 className="text-xl font-bold mb-1">Comprobante de Cobro</h1>
        <hr className="my-3" />
        <table className="w-full text-sm">
          <tbody>
            <tr><td className="py-1 text-gray-500 w-40">Cliente</td><td className="font-medium">{receivable.customerName}</td></tr>
            <tr><td className="py-1 text-gray-500">Orden</td><td>#{receivable.orderNumber}</td></tr>
            <tr><td className="py-1 text-gray-500">Monto cobrado</td><td className="font-bold">{formatCurrency(Number(amount))}</td></tr>
            <tr><td className="py-1 text-gray-500">Método</td><td>{methodLabel}</td></tr>
            {reference && <tr><td className="py-1 text-gray-500">Referencia</td><td>{reference}</td></tr>}
            <tr><td className="py-1 text-gray-500">Fecha</td><td>{dateLabel}</td></tr>
          </tbody>
        </table>
        <hr className="my-3" />
        <p className="text-xs text-gray-400">SmartKubik · Comprobante generado automáticamente</p>
      </div>

      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <DialogTitle className="text-lg">Cobro Registrado</DialogTitle>
            </div>
          </DialogHeader>

          {/* Receipt body */}
          <div className="rounded-xl border border-border bg-muted/30 divide-y divide-border text-sm">
            <Row label="Cliente" value={receivable.customerName} bold />
            <Row label="Orden" value={`#${receivable.orderNumber}`} />
            <Row label="Monto cobrado" value={formatCurrency(Number(amount))} bold highlight />
            <Row label="Método" value={methodLabel} />
            {reference && <Row label="Referencia" value={reference} />}
            <Row label="Fecha" value={dateLabel} />
            <Row label="Nuevo saldo" value={formatCurrency(0)} />
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row mt-2">
            <Button variant="outline" className="gap-2 flex-1" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button className="gap-2 flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleWhatsApp}>
              <MessageSquare className="h-4 w-4" />
              Compartir
            </Button>
          </DialogFooter>
          <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={onClose}>
            Cerrar
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ label, value, bold = false, highlight = false }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 gap-4">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={`text-xs text-right ${bold ? 'font-semibold' : ''} ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}
