import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Boxes } from '@/components/ui/background-boxes.tsx';
import logoSmartKubik from '../assets/logo-smartkubik.png';
import logoSmartKubikLight from '../assets/logo-smartkubik-light.png';
import SalesContactModal from '@/components/SalesContactModal.jsx';

function LoginV2() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSalesModalOpen, setSalesModalOpen] = useState(false);
  const {
    login,
    isMultiTenantEnabled,
    logout,
  } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
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

        // Ir directamente a la página de organizaciones en lugar de mostrar el modal
        if (roleName === 'super_admin') {
          navigate('/super-admin');
        } else {
          navigate('/organizations');
        }
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50 dark:bg-background transition-colors duration-300">
      {/* Background RippleGrid/Boxes */}
      <div className="absolute inset-0 z-0 opacity-75 dark:opacity-100 transition-opacity duration-300">
        <Boxes />
      </div>

      {/* Content Container */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row pointer-events-none">
        <style>{`
          .pointer-events-auto * {
            pointer-events: auto;
          }
          [data-login-hero] {
            font-size: 80px !important;
          }
        `}</style>

        {/* Logo - Top Left */}
        <div className="absolute top-0 left-0 px-6 py-12 lg:py-16 lg:px-6">
          <img src={logoSmartKubik} alt="SmartKubik" className="h-9 w-auto hidden dark:block" />
          <img src={logoSmartKubikLight} alt="SmartKubik" className="h-9 w-auto block dark:hidden" />
        </div>

        {/* Hero Section - Left Side */}
        <div className="flex-1 flex items-center justify-center p-12 mt-24 lg:w-1/2">
          <div className="max-w-2xl text-center lg:text-left">
            <h1 data-login-hero className="font-display font-extrabold text-gray-900 dark:text-white mb-8 leading-tight tracking-tight transition-colors" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', textShadow: '0 2px 10px rgba(0,0,0,0.1), 0 4px 20px rgba(0,0,0,0.1)' }}>
              Todo tu negocio, un solo lugar
            </h1>
            <p className="font-inter text-lg md:text-xl lg:text-2xl font-light text-gray-700 dark:text-gray-200 mb-10 leading-relaxed transition-colors">
              Simplifica tu gestión, multiplica tus resultados. Software modular para tiendas, hoteles, clínicas, salones de belleza, restaurantes y más. Se adapta y crece contigo. 🚀
            </p>
            <Link to="/register" className="pointer-events-auto">
              <Button
                size="lg"
                className="bg-blue-600 text-white hover:bg-blue-700 font-semibold px-8 py-6 text-base border border-transparent shadow-lg hover:shadow-xl transition-all"
              >
                Registrar ahora
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="bg-white/80 dark:bg-transparent text-gray-900 dark:text-white hover:bg-gray-100 hover:dark:bg-blue-700 font-semibold px-7 py-5 text-sm border border-gray-300 dark:border-slate-700 pointer-events-auto ml-4 transition-colors"
              onClick={() => setSalesModalOpen(true)}
            >
              Habla con ventas
            </Button>
          </div>
        </div>

        {/* Login Box - Right Side */}
        <div className="w-full p-12 lg:w-1/2">
          <Card className="w-full h-full max-w-3xl bg-white/95 dark:bg-card/35 backdrop-blur-md shadow-2xl border-gray-200 dark:border-slate-700 flex flex-col pointer-events-auto transition-colors duration-300">
            <div className="flex-1"></div>
            <CardHeader className="flex-shrink-0 text-center">
              <CardTitle className="text-3xl text-gray-900 dark:text-white font-bold font-display transition-colors" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Iniciar Sesión</CardTitle>
            </CardHeader>
            <CardContent className="flex-[3] flex flex-col justify-between pt-8 pb-6 px-8">
              <div className="max-w-md mx-auto w-full flex-shrink-0">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 dark:text-gray-200 transition-colors">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-gray-700 dark:text-gray-200 transition-colors">Contraseña</Label>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white transition-colors"
                    />
                    <div className="flex justify-end">
                      <Link to="/forgot-password" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 hover:dark:text-blue-300 hover:underline transition-colors">
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </div>
                  </div>
                  {!isMultiTenantEnabled && (
                    <div className="space-y-2">
                      <Label htmlFor="tenantCode" className="text-gray-700 dark:text-gray-200 transition-colors">Código de Tenant (Opcional)</Label>
                      <Input
                        id="tenantCode"
                        type="text"
                        placeholder="EJ: SMARTFOOD"
                        value={tenantCode}
                        onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                        className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                      />
                    </div>
                  )}
                  {error && <p className="text-sm text-red-500 dark:text-red-400 font-medium">{error}</p>}
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all" disabled={loading}>
                    {loading ? 'Ingresando...' : 'Ingresar'}
                  </Button>
                </form>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-300 dark:border-slate-700 transition-colors" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-slate-900 px-2 text-gray-500 dark:text-gray-400 transition-colors">
                      O continuar con
                    </span>
                  </div>
                </div>
                <Button variant="outline" className="w-full bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-white hover:bg-gray-50 hover:dark:bg-slate-700 transition-colors" onClick={() => window.location.href = 'http://localhost:3000/api/v1/auth/google'}>
                  <img src="/assets/Google__G__logo.svg (1).png" alt="Google logo" className="mr-2 h-4 w-4" />
                  Google
                </Button>
                <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300 transition-colors">
                  ¿No tienes una cuenta?{' '}
                  <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 hover:dark:text-blue-300 underline font-medium transition-colors">
                    Regístrate
                  </Link>
                </div>
              </div>
              {/* Logo at the very bottom */}
              <div className="flex justify-center mt-8">
                <img src={logoSmartKubik} alt="SmartKubik" className="h-6 w-auto opacity-70 hidden dark:block" />
                <img src={logoSmartKubikLight} alt="SmartKubik" className="h-6 w-auto opacity-70 block dark:hidden" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <SalesContactModal isOpen={isSalesModalOpen} onOpenChange={setSalesModalOpen} />
    </div>
  );
}

export default LoginV2;
