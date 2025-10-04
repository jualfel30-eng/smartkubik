import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchApi } from '../lib/api';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await fetchApi('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          tenantCode: tenantCode.trim() || undefined
        }),
      });
      setSuccess(true);
      setEmail('');
      setTenantCode('');
    } catch (err) {
      setError(err.message || 'Error al enviar el correo de recuperación. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Recuperar Contraseña</CardTitle>
          <CardDescription>
            Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">
                  ¡Correo enviado! Revisa tu bandeja de entrada para las instrucciones de recuperación.
                </AlertDescription>
              </Alert>
              <div className="text-center">
                <Link to="/login">
                  <Button variant="outline" className="w-full">
                    Volver al Login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenantCode">Código de Tenant (Opcional)</Label>
                <Input
                  id="tenantCode"
                  type="text"
                  placeholder="Dejar en blanco para Super Admin"
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Si eres un usuario normal, ingresa el código de tu organización.
                </p>
              </div>
              {error && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar instrucciones'}
              </Button>
              <div className="text-center">
                <Link to="/login" className="text-sm text-primary hover:underline">
                  Volver al Login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ForgotPassword;
