import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { fetchApi } from '@/lib/api';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

function ConfirmAccount() {
  const location = useLocation();
  const navigate = useNavigate();
  const { tenant, user } = useAuth();

  const initialEmail = location.state?.email || user?.email || '';
  const initialPlan = location.state?.plan || tenant?.subscriptionPlan || '';
  const tenantCode = location.state?.tenant?.code || tenant?.code || '';

  const [email] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!code || !email || !tenantCode) {
      setError('Información incompleta para confirmar la cuenta.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      await fetchApi('/onboarding/confirm', {
        method: 'POST',
        body: JSON.stringify({
          email,
          tenantCode,
          confirmationCode: code,
        }),
        isPublic: true,
      });
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err) {
      setError(err.message || 'No fue posible confirmar la cuenta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md shadow-lg border border-muted-foreground/10">
        <CardHeader className="space-y-2 text-center">
          <Badge className="mx-auto bg-primary/10 text-primary">Confirmación pendiente</Badge>
          <CardTitle className="text-2xl">¡Ya casi terminamos!</CardTitle>
          <CardDescription>
            Ingresa el código de 6 dígitos que enviamos a <strong>{email}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-md border border-muted-foreground/20 bg-muted/20 p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              Plan seleccionado: <span className="text-primary">{initialPlan || 'Sin plan'}</span>
            </p>
            <p className="mt-1">
              Una vez confirmada la cuenta, podrás activar todos los módulos de tu plan y empezar a
              cargar productos.
            </p>
          </div>

          {success ? (
            <div className="flex flex-col items-center gap-3 text-success">
              <CheckCircle2 className="h-10 w-10" />
              <p className="text-sm font-medium text-center">Cuenta confirmada correctamente. Redirigiendo…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="code" className="text-sm font-medium">
                  Código de confirmación
                </label>
                <Input
                  id="code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Ingresa los 6 dígitos"
                  maxLength={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  El código expira en 1 hora. Si necesitas otro, comunícate con soporte.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm">
                  <ShieldAlert className="h-4 w-4 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Confirmando…' : 'Confirmar cuenta'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ConfirmAccount;
