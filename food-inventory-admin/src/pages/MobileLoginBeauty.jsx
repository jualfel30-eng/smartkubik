import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/use-auth.jsx';
import { getApiBaseUrl } from '@/lib/api.js';
import { DUR, EASE } from '@/lib/motion.js';
import haptics from '@/lib/haptics.js';
import logoSmartKubik from '../assets/logo-smartkubik.png';

/* ── Inline SVG icons (no extra deps) ──────────────────────── */
const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
  </svg>
);

const Spinner = () => (
  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

/* ── Google OAuth URL builder ──────────────────────────────── */
const getGoogleOAuthUrl = () => {
  let base = getApiBaseUrl();
  if (base.endsWith('/api/v1')) base = base.slice(0, -7);
  return `${base}/api/v1/auth/google`;
};

/* ── Smart error mapper ────────────────────────────────────── */
const mapError = (err) => {
  const msg = err?.message || '';

  if (msg.includes('bloqueada') || msg.includes('Bloqueada')) {
    return { text: msg, type: 'locked' };
  }
  if (msg.includes('inactivo') || msg.includes('Inactivo')) {
    return { text: 'Tu cuenta está inactiva. Contacta soporte.', type: 'inactive' };
  }
  if (msg.includes('2FA') || msg.includes('2fa')) {
    return { text: msg, type: '2fa' };
  }
  if (msg.includes('Credenciales') || msg.includes('credenciales')) {
    return { text: 'Email o contraseña incorrectos', type: 'credentials' };
  }
  if (err instanceof TypeError && msg.includes('fetch')) {
    return { text: 'Sin conexión a internet', type: 'network' };
  }

  return { text: msg || 'Algo salió mal. Intenta de nuevo.', type: 'generic' };
};

/* ── Motion variants ───────────────────────────────────────── */
const logoVariant = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: DUR.hero, ease: EASE.out } },
};

const formVariant = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.slow, ease: EASE.out, delay: 0.15 },
  },
};

const errorVariant = {
  initial: { opacity: 0, y: -8, height: 0, marginTop: 0 },
  animate: { opacity: 1, y: 0, height: 'auto', marginTop: 12, transition: { duration: DUR.base, ease: EASE.out } },
  exit: { opacity: 0, y: -8, height: 0, marginTop: 0, transition: { duration: DUR.fast, ease: EASE.out } },
};

/* ── Component ─────────────────────────────────────────────── */
export default function MobileLoginBeauty() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [showTenantCode, setShowTenantCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null); // { text, type }
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const emailRef = useRef(null);
  const navigate = useNavigate();
  const { login, isMultiTenantEnabled, logout } = useAuth();

  // Auto-focus email on mount
  useEffect(() => {
    const t = setTimeout(() => emailRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  // Dismiss error on input change
  const handleEmailChange = (e) => { setEmail(e.target.value); if (error) setError(null); };
  const handlePasswordChange = (e) => { setPassword(e.target.value); if (error) setError(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || success) return;
    setError(null);
    setLoading(true);

    try {
      const result = await login(
        email,
        password,
        isMultiTenantEnabled ? undefined : tenantCode.trim().toUpperCase() || undefined,
      );

      const roleName = result?.user?.role?.name;

      // ── Multi-tenant flow (mirrors LoginV2 exactly) ──
      if (isMultiTenantEnabled && Array.isArray(result?.memberships)) {
        const memberships = result.memberships;

        if (memberships.length === 0) {
          if (roleName === 'super_admin') {
            setSuccess(true); haptics.success();
            setTimeout(() => navigate('/super-admin'), 400);
            return;
          }
          setError({ text: 'Tu cuenta no tiene organizaciones activas.', type: 'generic' });
          logout();
          return;
        }

        const activeMemberships = memberships.filter((m) => m.status === 'active');

        if (activeMemberships.length === 0) {
          if (roleName === 'super_admin') {
            setSuccess(true); haptics.success();
            setTimeout(() => navigate('/super-admin'), 400);
            return;
          }
          setError({ text: 'Todas tus organizaciones están inactivas.', type: 'generic' });
          logout();
          return;
        }

        setSuccess(true); haptics.success();
        const target = roleName === 'super_admin' ? '/super-admin' : '/organizations';
        setTimeout(() => navigate(target), 400);
        return;
      }

      // ── Single-tenant flow ──
      if (!result?.success) {
        setError({ text: result?.message || 'Error en el servidor.', type: 'generic' });
        return;
      }

      setSuccess(true); haptics.success();
      const target = result?.user?.role?.name === 'super_admin' ? '/super-admin' : '/organizations';
      setTimeout(() => navigate(target), 400);
    } catch (err) {
      console.error('Login error:', err);
      haptics.error();
      setError(mapError(err));
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full min-h-[48px] bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-3 text-base text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors';

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#0a0e1a] px-6 pt-12 pb-6">
      {/* ── Logo + badge ── */}
      <motion.div className="flex flex-col items-center pb-6" {...logoVariant}>
        <img src={logoSmartKubik} alt="SmartKubik" className="h-8 w-auto" />
      </motion.div>

      {/* ── Form area ── */}
      <motion.div className="flex-1 flex flex-col justify-center" {...formVariant}>
        <h1 className="text-xl font-bold text-white mb-6">Bienvenido de vuelta</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Correo electrónico
            </label>
            <input
              ref={emailRef}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              required
              value={email}
              onChange={handleEmailChange}
              placeholder="tu@email.com"
              className={inputClass}
              readOnly={loading || success}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={handlePasswordChange}
                className={`${inputClass} pr-12`}
                readOnly={loading || success}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => { setShowPassword((v) => !v); haptics.tap(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Forgot password */}
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs text-blue-400 font-medium hover:text-blue-300 transition-colors">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div {...errorVariant} className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                <p>{error.text}</p>
                {error.type === 'credentials' && (
                  <Link to="/forgot-password" className="text-xs text-red-300 underline mt-1 inline-block">
                    ¿La olvidaste?
                  </Link>
                )}
                {error.type === 'network' && (
                  <button
                    type="submit"
                    className="text-xs text-red-300 underline mt-1 inline-block"
                  >
                    Reintentar
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login button */}
          <motion.button
            type="submit"
            disabled={loading || success || !email || !password}
            whileTap={{ scale: 0.97 }}
            className={`w-full min-h-[48px] rounded-xl font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 ${
              success
                ? 'bg-green-500 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {loading ? (
              <>
                <Spinner />
                <span>Entrando...</span>
              </>
            ) : success ? (
              <span>✓</span>
            ) : (
              'Entrar'
            )}
          </motion.button>
        </form>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/[0.08]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#0a0e1a] px-3 text-gray-500">o</span>
          </div>
        </div>

        {/* Google OAuth */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => { window.location.href = getGoogleOAuthUrl(); }}
          className="w-full min-h-[48px] rounded-xl border border-white/[0.08] bg-white/[0.04] text-white text-sm font-medium flex items-center justify-center gap-2.5 hover:bg-white/[0.08] transition-colors"
        >
          <img src="/assets/Google__G__logo.svg (1).png" alt="" className="h-4 w-4" />
          Continuar con Google
        </motion.button>

        {/* Tenant code (hidden by default) */}
        {!isMultiTenantEnabled && (
          <div className="mt-4 text-center">
            {!showTenantCode ? (
              <button
                type="button"
                onClick={() => { setShowTenantCode(true); haptics.tap(); }}
                className="text-xs text-gray-500 underline hover:text-gray-400 transition-colors"
              >
                Ingresar con código de negocio
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2"
              >
                <input
                  type="text"
                  placeholder="CÓDIGO DE NEGOCIO"
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                  className={`${inputClass} text-center text-sm tracking-widest`}
                />
              </motion.div>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Register link (bottom) ── */}
      <div className="text-center pt-4">
        <p className="text-sm text-gray-500">¿No tienes cuenta?</p>
        <Link
          to="/register/beauty"
          onClick={() => haptics.tap()}
          className="text-sm text-blue-400 font-semibold hover:text-blue-300 transition-colors"
        >
          Prueba gratis 14 días →
        </Link>
      </div>
    </div>
  );
}
