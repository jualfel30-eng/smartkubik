import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Boxes } from '@/components/ui/background-boxes.tsx';
import logoSmartKubik from '../assets/logo-smartkubik.png';
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
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background RippleGrid */}
      <div className="absolute inset-0 z-0">
        <Boxes />
      </div>

      {/* Content Container */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row pointer-events-none">
        <style>{`
          .pointer-events-auto * {
            pointer-events: auto;
          }
        `}</style>

        {/* Logo - Top Left */}
        <div className="absolute top-0 left-0 px-6 py-12 lg:py-16 lg:px-6">
          <img src={logoSmartKubik} alt="SmartKubik" className="h-12 w-auto" />
        </div>

        {/* Hero Section - Left Side */}
        <div className="flex-1 flex items-center justify-center p-12 mt-24 lg:w-1/2">
          <div className="max-w-2xl text-center lg:text-left">
            <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-extrabold text-white mb-6 leading-tight tracking-tight" style={{textShadow: '0 2px 10px rgba(0, 0, 0, 0.5), 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 40px rgba(82, 39, 255, 0.15)'}}>
              TODAS LAS PIEZAS DE TU NEGOCIO EN UN SOLO LUGAR
            </h1>
            <p className="font-inter text-sm md:text-base lg:text-lg font-light text-gray-200 mb-8 leading-relaxed" style={{textShadow: '0 2px 8px rgba(0, 0, 0, 0.6), 0 4px 16px rgba(0, 0, 0, 0.4)'}}>
              Simplifica tu gestión, multiplica tus resultados. Software modular para tiendas, hoteles, clínicas, salones de belleza, restaurantes y más. Se adapta y crece contigo. 🚀
            </p>
            <Link to="/register" className="pointer-events-auto">
              <Button
                size="lg"
                className="bg-blue-600 text-white hover:bg-blue-700 font-semibold px-7 py-5 text-sm border border-slate-700"
              >
                Registrar ahora
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="bg-transparent text-white hover:bg-blue-700 font-semibold px-7 py-5 text-sm border border-slate-700 pointer-events-auto ml-4"
              onClick={() => setSalesModalOpen(true)}
            >
              Habla con ventas
            </Button>
          </div>
        </div>

        {/* Login Box - Right Side */}
        <div className="w-full p-12 lg:w-1/2">
          <Card className="w-full h-full max-w-3xl bg-card/35 backdrop-blur-md shadow-2xl border-slate-700 flex flex-col pointer-events-auto">
            <div className="flex-1"></div>
            <CardHeader className="flex-shrink-0 text-center">
              <CardTitle className="text-3xl text-white font-bold font-display">Iniciar Sesión</CardTitle>
            </CardHeader>
            <CardContent className="flex-[3] flex flex-col justify-between pt-8 pb-6 px-8">
              <div className="max-w-md mx-auto w-full flex-shrink-0">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-200">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-gray-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-gray-200">Contraseña</Label>
                      <Link to="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 hover:underline">
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  {!isMultiTenantEnabled && (
                    <div className="space-y-2">
                      <Label htmlFor="tenantCode" className="text-gray-200">Código de Tenant (Opcional)</Label>
                      <Input
                        id="tenantCode"
                        type="text"
                        placeholder="EJ: SMARTFOOD"
                        value={tenantCode}
                        onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                        className="bg-slate-800 border-slate-700 text-white placeholder:text-gray-400"
                      />
                    </div>
                  )}
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                    {loading ? 'Ingresando...' : 'Ingresar'}
                  </Button>
                </form>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-700" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-900 px-2 text-gray-400">
                      O continuar con
                    </span>
                  </div>
                </div>
                <Button variant="outline" className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700 hover:text-white" onClick={() => window.location.href = 'http://localhost:3000/api/v1/auth/google'}>
                  <img src="/assets/Google__G__logo.svg (1).png" alt="Google logo" className="mr-2 h-4 w-4" />
                  Google
                </Button>
                <div className="mt-4 text-center text-sm text-gray-300">
                  ¿No tienes una cuenta?{' '}
                  <Link to="/register" className="text-blue-400 hover:text-blue-300 underline">
                    Regístrate
                  </Link>
                </div>
              </div>
              {/* Logo at the very bottom */}
              <div className="flex justify-center mt-8">
                <img src={logoSmartKubik} alt="SmartKubik" className="h-8 w-auto opacity-70" />
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
