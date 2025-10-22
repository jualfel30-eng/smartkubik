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
  const { loginWithTokens, getLastLocation } = useAuth();

  // IMPORTANTE: NO usar el tenant/user del auth context, ya que podría ser de otra sesión
  // Solo usar los datos que vienen del estado de navegación (del registro)
  const tenantFromState = location.state?.tenant;
  const emailFromState = location.state?.email;
  const planFromState = location.state?.plan;

  const [email] = useState(emailFromState || '');
  const [plan] = useState(planFromState || '');
  const [code, setCode] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Validar que tengamos los datos necesarios del registro
  if (!emailFromState || !tenantFromState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30 px-4 py-10">
        <Card className="w-full max-w-md shadow-lg border border-destructive/30">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl text-destructive">Error de Navegación</CardTitle>
            <CardDescription>
              No se pudo cargar la información del registro. Por favor, intenta registrarte nuevamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/register')}
              className="w-full"
            >
              Volver al registro
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tenantId = tenantFromState.id || tenantFromState._id;
  const tenantCode = tenantFromState.code;

  const handleSubmit = async (event) => {
    event.preventDefault();

    console.log('🔐 [ConfirmAccount] Iniciando confirmación...');
    console.log('🔐 [ConfirmAccount] Email:', email);
    console.log('🔐 [ConfirmAccount] TenantId:', tenantId);
    console.log('🔐 [ConfirmAccount] TenantCode:', tenantCode);
    console.log('🔐 [ConfirmAccount] Code:', code);

    if (!code || !email || (!tenantId && !tenantCode)) {
      console.error('❌ [ConfirmAccount] Información incompleta');
      setError('Información incompleta para confirmar la cuenta.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        email,
        confirmationCode: code,
      };

      if (tenantId) {
        payload.tenantId = tenantId;
      }

      if (tenantCode) {
        payload.tenantCode = tenantCode;
      }

      console.log('📤 [ConfirmAccount] Enviando payload:', payload);

      const response = await fetchApi('/onboarding/confirm', {
        method: 'POST',
        body: JSON.stringify(payload),
        isPublic: true,
      });

      console.log('✅ [ConfirmAccount] Respuesta del servidor:', response);

      setSuccess(true);
      await loginWithTokens(response);
      const destination = typeof getLastLocation === 'function'
        ? getLastLocation() || '/dashboard'
        : '/dashboard';

      console.log('🔄 [ConfirmAccount] Redirigiendo a:', destination);
      setTimeout(() => navigate(destination), 1200);
    } catch (err) {
      console.error('❌ [ConfirmAccount] Error:', err);
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
              Plan seleccionado: <span className="text-primary">{plan || 'Sin plan'}</span>
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
