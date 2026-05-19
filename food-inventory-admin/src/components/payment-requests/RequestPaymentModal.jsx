import { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import {
  Check,
  CheckCircle2,
  Copy,
  Link as LinkIcon,
  Loader2,
  MessageCircle,
  QrCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createPaymentRequest } from '@/lib/paymentRequestsApi';

/**
 * Three-channel issuance modal for internal orders (POS / WhatsApp / API /
 * manual — anything that isn't a storefront order, since those auto-issue).
 *
 * Tabs:
 *   - WhatsApp: validate phone, fire create with delivery=whatsapp.
 *     Backend sends the link via Whapi; we just show "enviado".
 *   - Copiar link: create with delivery=manual, copy the resulting URL to
 *     the clipboard. The cashier shares it however (in-person, IG DM…).
 *   - QR: create with delivery=manual, render the URL as a QR code the
 *     customer can scan from their phone (a popular pattern for restaurants
 *     where the customer is sitting at a table).
 *
 * Single backend call per session — once a PR is created, the modal flips
 * to "result" mode showing the artifact. Closing the modal resets state for
 * the next time it opens.
 *
 * Note: backend doesn't dedupe PRs per order; a paranoid second click that
 * reopens the modal would create a second PR. The modal mitigates by
 * staying on the result view until explicit close — the cashier can't
 * accidentally re-create from this surface.
 */

const VE_PHONE_DIGITS = /^58\d{10}$|^0\d{10}$|^\d{10,11}$/;

function normalizeVePhoneForDisplay(raw) {
  if (!raw) return '';
  return raw.trim().replace(/[^0-9+]/g, '');
}

function isLikelyValidVePhone(raw) {
  if (!raw) return false;
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13 && VE_PHONE_DIGITS.test(digits);
}

export function RequestPaymentModal({
  open,
  onOpenChange,
  order,
  onCreated,
}) {
  const initialPhone = order?.customerPhone || '';
  const [phone, setPhone] = useState(initialPhone);
  const [tab, setTab] = useState('whatsapp');
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState(null); // { portalUrl, deliveryChannel }
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Reset when reopening — keep result on close-then-reopen-with-different-order
  // out of scope; resetting unconditionally is the safe default.
  useEffect(() => {
    if (open) {
      setPhone(order?.customerPhone || '');
      setTab(order?.customerPhone ? 'whatsapp' : 'link');
      setResult(null);
      setQrDataUrl(null);
      setLinkCopied(false);
      setCreating(false);
    }
  }, [open, order?.customerPhone]);

  const canSendWhatsApp = isLikelyValidVePhone(phone) && !creating;

  const runCreate = useCallback(
    async (deliveryChannel, opts = {}) => {
      if (!order?._id) {
        toast.error('Falta la información de la orden');
        return;
      }
      setCreating(true);
      try {
        const data = await createPaymentRequest({
          entityType: 'order',
          entityId: order._id,
          deliveryPhone: opts.phone,
          deliveryChannel,
        });
        if (!data?.portalUrl) {
          throw new Error('La solicitud se creó pero no recibimos el enlace');
        }
        setResult({
          portalUrl: data.portalUrl,
          deliveryChannel,
        });
        onCreated?.(data.paymentRequest);
        return data;
      } catch (err) {
        toast.error(err?.message || 'No se pudo crear la solicitud de pago');
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [onCreated, order?._id],
  );

  const handleSendWhatsApp = async () => {
    try {
      await runCreate('whatsapp', { phone });
      toast.success('Link enviado por WhatsApp');
    } catch {
      /* error already toasted */
    }
  };

  const handleCopyOnly = async () => {
    try {
      const data = await runCreate('manual');
      if (data?.portalUrl) {
        await navigator.clipboard.writeText(data.portalUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 1500);
        toast.success('Enlace copiado al portapapeles');
      }
    } catch {
      /* error already toasted */
    }
  };

  const handleShowQr = async () => {
    try {
      const data = await runCreate('manual');
      if (data?.portalUrl) {
        const png = await QRCode.toDataURL(data.portalUrl, {
          errorCorrectionLevel: 'M',
          margin: 1,
          scale: 6,
        });
        setQrDataUrl(png);
      }
    } catch {
      /* error already toasted */
    }
  };

  const handleCopyResult = async () => {
    if (!result?.portalUrl) return;
    try {
      await navigator.clipboard.writeText(result.portalUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  };

  const orderRef = useMemo(() => {
    if (!order) return '';
    return `${order.orderNumber || order._id?.slice(-6) || 'Orden'}`;
  }, [order]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar comprobante</DialogTitle>
          <DialogDescription>
            Genera un enlace seguro para que el cliente suba el comprobante de
            pago de la orden <span className="font-medium">{orderRef}</span>.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <ResultView
            portalUrl={result.portalUrl}
            deliveryChannel={result.deliveryChannel}
            qrDataUrl={qrDataUrl}
            linkCopied={linkCopied}
            onCopy={handleCopyResult}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="mt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="whatsapp" className="gap-1.5">
                <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                WhatsApp
              </TabsTrigger>
              <TabsTrigger value="link" className="gap-1.5">
                <LinkIcon className="h-3.5 w-3.5" aria-hidden />
                Copiar
              </TabsTrigger>
              <TabsTrigger value="qr" className="gap-1.5">
                <QrCode className="h-3.5 w-3.5" aria-hidden />
                QR
              </TabsTrigger>
            </TabsList>

            <TabsContent value="whatsapp" className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="customer-phone"
                  className="text-xs uppercase tracking-wide text-muted-foreground"
                >
                  Teléfono del cliente
                </Label>
                <Input
                  id="customer-phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="0414-1234567"
                  value={phone}
                  onChange={(e) => setPhone(normalizeVePhoneForDisplay(e.target.value))}
                  className="h-10"
                />
                <p className="text-[11px] text-muted-foreground">
                  Le enviaremos el enlace por WhatsApp Business. Formato VE.
                </p>
              </div>
              <Button
                onClick={handleSendWhatsApp}
                disabled={!canSendWhatsApp}
                className="w-full gap-2"
                size="lg"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <MessageCircle className="h-4 w-4" aria-hidden />
                )}
                Enviar por WhatsApp
              </Button>
            </TabsContent>

            <TabsContent value="link" className="space-y-3 pt-3">
              <p className="text-sm text-muted-foreground">
                Crea el enlace y lo copiamos al portapapeles para que lo
                compartas como quieras (Instagram DM, SMS, en persona…).
              </p>
              <Button
                onClick={handleCopyOnly}
                disabled={creating}
                className="w-full gap-2"
                size="lg"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <LinkIcon className="h-4 w-4" aria-hidden />
                )}
                Generar y copiar enlace
              </Button>
            </TabsContent>

            <TabsContent value="qr" className="space-y-3 pt-3">
              <p className="text-sm text-muted-foreground">
                Útil cuando el cliente está en frente tuyo. Genera el código y
                muéstrale la pantalla para que lo escanee con su teléfono.
              </p>
              <Button
                onClick={handleShowQr}
                disabled={creating}
                className="w-full gap-2"
                size="lg"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <QrCode className="h-4 w-4" aria-hidden />
                )}
                Generar QR
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResultView({
  portalUrl,
  deliveryChannel,
  qrDataUrl,
  linkCopied,
  onCopy,
  onClose,
}) {
  const isWhatsApp = deliveryChannel === 'whatsapp';

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex items-start gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.07] p-3 text-sm">
        <CheckCircle2
          className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400"
          aria-hidden
        />
        <div className="flex-1">
          <p className="font-medium text-emerald-50">
            {isWhatsApp
              ? 'Mensaje enviado al cliente'
              : 'Solicitud creada'}
          </p>
          <p className="mt-0.5 text-emerald-100/80 text-xs">
            {isWhatsApp
              ? 'Cuando suba el comprobante recibirás una notificación.'
              : 'Comparte el enlace con el cliente. Cuando suba el comprobante recibirás una notificación.'}
          </p>
        </div>
      </div>

      {qrDataUrl && (
        <div className="flex flex-col items-center gap-2 rounded-xl border bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="Código QR para abrir el portal de pago"
            className="h-48 w-48"
          />
          <p className="text-[11px] text-slate-700">
            Pídele al cliente que escanee con su cámara.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Enlace del portal
        </Label>
        <div className="flex items-center gap-2">
          <Input
            value={portalUrl}
            readOnly
            onFocus={(e) => e.target.select()}
            className="h-10 text-xs font-mono"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onCopy}
            aria-label="Copiar enlace"
            className="shrink-0"
          >
            {linkCopied ? (
              <Check className="h-4 w-4 text-emerald-400" strokeWidth={2.5} />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}
