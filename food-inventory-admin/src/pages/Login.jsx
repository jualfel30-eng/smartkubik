import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RippleGrid from '@/components/ui/RippleGrid.jsx';
import logoSmartKubik from '../assets/logo-smartkubik.png';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Background RippleGrid */}
      <div className="absolute inset-0 z-0">
        <RippleGrid
          enableRainbow={true}
          gridColor="#5227ff"
          rippleIntensity={0.02}
          gridSize={16}
          gridThickness={50}
          fadeDistance={1.6}
          vignetteStrength={5}
          glowIntensity={0.5}
          opacity={0.55}
          gridRotation={0}
          mouseInteraction={true}
          mouseInteractionRadius={0.8}
          centerOffsetX={-0.5}
          centerOffsetY={0}
        />
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
        <div className="flex-1 flex items-center justify-center px-6 py-12 lg:py-16">
          <div className="max-w-2xl text-center lg:text-left">
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight" style={{textShadow: '0 2px 10px rgba(0, 0, 0, 0.5), 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 40px rgba(82, 39, 255, 0.15)'}}>
              TODAS LAS CARAS DE TU NEGOCIO EN UN SOLO LUGAR
            </h1>
            <p className="font-inter text-lg md:text-xl lg:text-2xl font-light text-gray-200 mb-8 leading-relaxed" style={{textShadow: '0 2px 8px rgba(0, 0, 0, 0.6), 0 4px 16px rgba(0, 0, 0, 0.4)'}}>
              Una solución TODO EN UNO para potenciar tu negocio
            </p>
            <Link to="/register" className="pointer-events-auto">
              <Button
                size="lg"
                className="bg-purple-600 text-white hover:bg-purple-700 font-semibold px-7 py-5 text-base"
              >
                Registrar ahora
              </Button>
            </Link>
          </div>
        </div>

        {/* Login Box - Right Side */}
        <div className="w-full lg:w-auto lg:min-w-[960px] p-6 lg:p-12">
          <Card className="w-full h-full max-w-4xl bg-slate-900/35 backdrop-blur-md shadow-2xl border-slate-700 flex flex-col pointer-events-auto">
            <div className="flex-1"></div>
            <CardHeader className="flex-shrink-0 text-center">
              <CardTitle className="text-5xl text-white font-bold">Iniciar Sesión</CardTitle>
            </CardHeader>
            <CardContent className="flex-[3] flex flex-col justify-between pt-8 pb-6">
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
                      <Link to="/forgot-password" className="text-sm text-purple-400 hover:text-purple-300 hover:underline">
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
                  <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white" disabled={loading}>
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
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M44.5 24.3H24.5V34.5H36.5C34.5 39.5 29.5 42.5 24.5 42.5C16.5 42.5 10.5 36.5 10.5 28.5C10.5 20.5 16.5 14.5 24.5 14.5C28.5 14.5 31.5 16.5 33.5 18.5L40.5 11.5C36.5 7.5 31.5 5.5 24.5 5.5C13.5 5.5 4.5 14.5 4.5 28.5C4.5 42.5 13.5 51.5 24.5 51.5C35.5 51.5 44.5 43.5 44.5 28.5C44.5 26.8 44.5 25.5 44.5 24.3Z" fill="#FFC107"/>
                      <path d="M44.5 24.3H24.5V34.5H36.5C34.5 39.5 29.5 42.5 24.5 42.5C16.5 42.5 10.5 36.5 10.5 28.5C10.5 20.5 16.5 14.5 24.5 14.5C28.5 14.5 31.5 16.5 33.5 18.5L40.5 11.5C36.5 7.5 31.5 5.5 24.5 5.5C13.5 5.5 4.5 14.5 4.5 28.5C4.5 42.5 13.5 51.5 24.5 51.5C35.5 51.5 44.5 43.5 44.5 28.5C44.5 26.8 44.5 25.5 44.5 24.3Z" fillOpacity="0.1"/>
                      <path d="M4.5 28.5C4.5 14.5 13.5 5.5 24.5 5.5C31.5 5.5 36.5 7.5 40.5 11.5L33.5 18.5C31.5 16.5 28.5 14.5 24.5 14.5C16.5 14.5 10.5 20.5 10.5 28.5C10.5 36.5 16.5 42.5 24.5 42.5C29.5 42.5 34.5 39.5 36.5 34.5H24.5V24.3H44.5C44.5 25.5 44.5 26.8 44.5 28.5C44.5 43.5 35.5 51.5 24.5 51.5C13.5 51.5 4.5 42.5 4.5 28.5Z" fill="#FF3D00"/>
                      <path d="M44.5 24.3H24.5V34.5H36.5C34.5 39.5 29.5 42.5 24.5 42.5C16.5 42.5 10.5 36.5 10.5 28.5C10.5 20.5 16.5 14.5 24.5 14.5C28.5 14.5 31.5 16.5 33.5 18.5L40.5 11.5C36.5 7.5 31.5 5.5 24.5 5.5C13.5 5.5 4.5 14.5 4.5 28.5C4.5 42.5 13.5 51.5 24.5 51.5C35.5 51.5 44.5 43.5 44.5 28.5C44.5 26.8 44.5 25.5 44.5 24.3Z" fillOpacity="0.1"/>
                      <path d="M24.5 5.5C13.5 5.5 4.5 14.5 4.5 28.5C4.5 42.5 13.5 51.5 24.5 51.5C35.5 51.5 44.5 43.5 44.5 28.5C44.5 26.8 44.5 25.5 44.5 24.3H24.5V5.5Z" fill="#4CAF50"/>
                  </svg>
                  Google
                </Button>
                <div className="mt-4 text-center text-sm text-gray-300">
                  ¿No tienes una cuenta?{' '}
                  <Link to="/register" className="text-purple-400 hover:text-purple-300 underline">
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
    </div>
  );
}

export default Login;
