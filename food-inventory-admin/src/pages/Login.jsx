import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TenantPickerDialog } from '@/components/auth/TenantPickerDialog.jsx';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableMemberships, setAvailableMemberships] = useState([]);
  const [showTenantDialog, setShowTenantDialog] = useState(false);
  const [defaultMembershipId, setDefaultMembershipId] = useState(null);
  const [tenantSelectionError, setTenantSelectionError] = useState('');
  const closingAfterSelectionRef = useRef(false);
  const {
    login,
    selectTenant,
    isMultiTenantEnabled,
    isSwitchingTenant,
    logout,
  } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setTenantSelectionError('');
    setLoading(true);
    try {
      const result = await login(
        email,
        password,
        isMultiTenantEnabled ? undefined : tenantCode.trim().toUpperCase(),
      );

      const roleName = result?.user?.role?.name;

      if (isMultiTenantEnabled && Array.isArray(result?.memberships)) {
        const memberships = result.memberships;

        // Super admins no necesitan memberships
        if (memberships.length === 0) {
          if (roleName === 'super_admin') {
            navigate('/super-admin');
            return;
          }
          setError(
            'Tu cuenta no tiene organizaciones activas asignadas. Contacta a tu administrador.',
          );
          logout();
          return;
        }

        const activeMemberships = memberships.filter(
          (membership) => membership.status === 'active',
        );

        if (activeMemberships.length === 0) {
          if (roleName === 'super_admin') {
            navigate('/super-admin');
            return;
          }
          setError(
            'Todas tus organizaciones están inactivas. Contacta a tu administrador.',
          );
          logout();
          return;
        }

        setAvailableMemberships(memberships);
        setDefaultMembershipId(
          result.defaultMembershipId || activeMemberships[0]?.id || null,
        );
        setShowTenantDialog(true);
        return;
      }

      if (!result?.success) {
        setError(
          result?.message ||
            'Credenciales incorrectas o error en el servidor.',
        );
        return;
      }

      if (roleName === 'super_admin') {
        navigate('/super-admin');
      } else {
        navigate('/organizations');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleTenantSelection = async (
    membershipId,
    rememberAsDefault,
  ) => {
    setTenantSelectionError('');
    try {
      const result = await selectTenant(membershipId, {
        rememberAsDefault,
      });
      closingAfterSelectionRef.current = true;
      setShowTenantDialog(false);
      setAvailableMemberships([]);
      setDefaultMembershipId(null);

      const roleName = result?.user?.role?.name;
      if (roleName === 'super_admin') {
        navigate('/super-admin');
      } else {
        navigate('/organizations');
      }
    } catch (err) {
      console.error('Switch tenant error:', err);
      setTenantSelectionError(
        err.message || 'No se pudo activar la organización seleccionada.',
      );
    }
  };

  const handleTenantDialogClose = () => {
    if (closingAfterSelectionRef.current) {
      closingAfterSelectionRef.current = false;
      setAvailableMemberships([]);
      setDefaultMembershipId(null);
      setTenantSelectionError('');
      return;
    }

    setShowTenantDialog(false);
    setAvailableMemberships([]);
    setDefaultMembershipId(null);
    setTenantSelectionError('');
    logout();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            {isMultiTenantEnabled
              ? 'Ingresa tus credenciales. Podrás seleccionar tu organización después.'
              : 'Ingresa tus credenciales para acceder al panel de administración.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {!isMultiTenantEnabled && (
              <div className="space-y-2">
                <Label htmlFor="tenantCode">Código de Tenant (Opcional)</Label>
                <Input
                  id="tenantCode"
                  type="text"
                  placeholder="EJ: SMARTFOOD"
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                />
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">
                O continuar con
              </span>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={() => window.location.href = 'http://localhost:3000/api/v1/auth/google'}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M44.5 24.3H24.5V34.5H36.5C34.5 39.5 29.5 42.5 24.5 42.5C16.5 42.5 10.5 36.5 10.5 28.5C10.5 20.5 16.5 14.5 24.5 14.5C28.5 14.5 31.5 16.5 33.5 18.5L40.5 11.5C36.5 7.5 31.5 5.5 24.5 5.5C13.5 5.5 4.5 14.5 4.5 28.5C4.5 42.5 13.5 51.5 24.5 51.5C35.5 51.5 44.5 43.5 44.5 28.5C44.5 26.8 44.5 25.5 44.5 24.3Z" fill="#FFC107"/>
                <path d="M44.5 24.3H24.5V34.5H36.5C34.5 39.5 29.5 42.5 24.5 42.5C16.5 42.5 10.5 36.5 10.5 28.5C10.5 20.5 16.5 14.5 24.5 14.5C28.5 14.5 31.5 16.5 33.5 18.5L40.5 11.5C36.5 7.5 31.5 5.5 24.5 5.5C13.5 5.5 4.5 14.5 4.5 28.5C4.5 42.5 13.5 51.5 24.5 51.5C35.5 51.5 44.5 43.5 44.5 28.5C44.5 26.8 44.5 25.5 44.5 24.3Z" fillOpacity="0.1"/>
                <path d="M4.5 28.5C4.5 14.5 13.5 5.5 24.5 5.5C31.5 5.5 36.5 7.5 40.5 11.5L33.5 18.5C31.5 16.5 28.5 14.5 24.5 14.5C16.5 14.5 10.5 20.5 10.5 28.5C10.5 36.5 16.5 42.5 24.5 42.5C29.5 42.5 34.5 39.5 36.5 34.5H24.5V24.3H44.5C44.5 25.5 44.5 26.8 44.5 28.5C44.5 43.5 35.5 51.5 24.5 51.5C13.5 51.5 4.5 42.5 4.5 28.5Z" fill="#FF3D00"/>
                <path d="M44.5 24.3H24.5V34.5H36.5C34.5 39.5 29.5 42.5 24.5 42.5C16.5 42.5 10.5 36.5 10.5 28.5C10.5 20.5 16.5 14.5 24.5 14.5C28.5 14.5 31.5 16.5 33.5 18.5L40.5 11.5C36.5 7.5 31.5 5.5 24.5 5.5C13.5 5.5 4.5 14.5 4.5 28.5C4.5 42.5 13.5 51.5 24.5 51.5C35.5 51.5 44.5 43.5 44.5 28.5C44.5 26.8 44.5 25.5 44.5 24.3Z" fillOpacity="0.1"/>
                <path d="M24.5 5.5C13.5 5.5 4.5 14.5 4.5 28.5C4.5 42.5 13.5 51.5 24.5 51.5C35.5 51.5 44.5 43.5 44.5 28.5C44.5 26.8 44.5 25.5 44.5 24.3H24.5V5.5Z" fill="#4CAF50"/>
            </svg>
            Google
          </Button>
          <div className="mt-4 text-center text-sm">
            ¿No tienes una cuenta?{' '}
            <Link to="/register" className="underline">
              Regístrate
            </Link>
          </div>
        </CardContent>
      </Card>
      <TenantPickerDialog
        isOpen={showTenantDialog}
        memberships={availableMemberships}
        defaultMembershipId={defaultMembershipId}
        onSelect={handleTenantSelection}
        onCancel={handleTenantDialogClose}
        isLoading={isSwitchingTenant}
        errorMessage={tenantSelectionError}
      />
    </div>
  );
}

export default Login;
