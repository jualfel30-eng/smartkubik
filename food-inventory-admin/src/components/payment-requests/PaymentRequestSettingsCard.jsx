import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';
import { Loader2, ReceiptText } from 'lucide-react';

/**
 * Toggles the tenant-level Payment Requests behavior. Writes to the
 * dedicated `/tenant-payment-config` endpoint (separate from the existing
 * `Tenant.settings.paymentMethods` array which holds the bank info — the
 * backend bridges the two transparently).
 *
 * Three settings:
 *   - requirePaymentProof: auto-issue a PaymentRequest on every non-cash
 *     storefront order (the customer gets a portal link via WhatsApp).
 *   - allowPartialPayments: customer can submit a proof for less than the
 *     amount due, splitting payment across multiple proofs.
 *   - paymentRequestExpiryDays: how long the portal link stays valid
 *     (1-30 days). Sets the JWT expiry on creation.
 *
 * Renders independently from PaymentMethodsSettings so saving toggles
 * doesn't accidentally overwrite the bank-account form (and vice-versa).
 */
export function PaymentRequestSettingsCard() {
  const [requirePaymentProof, setRequirePaymentProof] = useState(false);
  const [allowPartialPayments, setAllowPartialPayments] = useState(false);
  const [expiryDays, setExpiryDays] = useState(7);
  const [expiryDaysRaw, setExpiryDaysRaw] = useState('7');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        // GET auto-creates a default config if missing (see TenantPaymentConfigService.getPaymentConfig)
        const res = await fetchApi('/tenant-payment-config');
        const cfg = res?.data || res || {};
        if (cancelled) return;
        setRequirePaymentProof(!!cfg.requirePaymentProof);
        setAllowPartialPayments(!!cfg.allowPartialPayments);
        const days = Number(cfg.paymentRequestExpiryDays ?? 7);
        const clamped = Math.min(30, Math.max(1, isNaN(days) ? 7 : days));
        setExpiryDays(clamped);
        setExpiryDaysRaw(String(clamped));
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load payment request settings', err);
          toast.error('No se pudo cargar la configuración de Solicitudes de pago');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleExpiryChange = (raw) => {
    setExpiryDaysRaw(raw);
    const n = Number(raw);
    if (!isNaN(n) && Number.isInteger(n) && n >= 1 && n <= 30) {
      setExpiryDays(n);
    }
  };

  const validExpiry = Number.isInteger(expiryDays) && expiryDays >= 1 && expiryDays <= 30;

  const handleSave = async () => {
    if (!validExpiry) {
      toast.error('Los días de expiración deben estar entre 1 y 30');
      return;
    }
    setSaving(true);
    try {
      // PUT upserts — we only send the 3 fields, paymentMethods (legacy)
      // and other tenant config fields stay untouched on the backend.
      await fetchApi('/tenant-payment-config', {
        method: 'PUT',
        body: JSON.stringify({
          requirePaymentProof,
          allowPartialPayments,
          paymentRequestExpiryDays: expiryDays,
        }),
      });
      toast.success('Solicitudes de pago — configuración guardada');
    } catch (err) {
      console.error('Failed to save payment request settings', err);
      toast.error(err?.message || 'No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <ReceiptText className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Solicitudes de pago</CardTitle>
            <CardDescription>
              Permite que tus clientes suban un comprobante en un portal seguro
              cuando paguen por transferencia, Pago Móvil o Zelle.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Cargando configuración…
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="require-payment-proof" className="text-base font-medium">
                  Pedir comprobante automáticamente
                </Label>
                <p className="text-xs text-muted-foreground">
                  Cada pedido de la tienda online recibe por WhatsApp un enlace
                  para subir el comprobante. Solo aplica a pagos no-efectivo.
                </p>
              </div>
              <Switch
                id="require-payment-proof"
                checked={requirePaymentProof}
                onCheckedChange={setRequirePaymentProof}
              />
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="allow-partial" className="text-base font-medium">
                  Aceptar abonos parciales
                </Label>
                <p className="text-xs text-muted-foreground">
                  El cliente puede pagar en varias partes. Si lo dejas en off,
                  cada comprobante debe cubrir el monto completo.
                </p>
              </div>
              <Switch
                id="allow-partial"
                checked={allowPartialPayments}
                onCheckedChange={setAllowPartialPayments}
              />
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-1">
                <Label htmlFor="expiry-days" className="text-base font-medium">
                  Días de validez del enlace
                </Label>
                <p className="text-xs text-muted-foreground">
                  Después de este plazo el enlace deja de funcionar. Entre 1 y 30 días.
                </p>
              </div>
              <Input
                id="expiry-days"
                type="number"
                inputMode="numeric"
                min={1}
                max={30}
                step={1}
                value={expiryDaysRaw}
                onChange={(e) => handleExpiryChange(e.target.value)}
                className={`h-10 w-20 text-center text-base ${
                  !validExpiry ? 'border-destructive focus-visible:ring-destructive' : ''
                }`}
              />
            </div>

            <div className="flex items-center justify-end pt-2">
              <Button onClick={handleSave} disabled={saving || !validExpiry} size="lg">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Guardando…
                  </>
                ) : (
                  'Guardar cambios'
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
