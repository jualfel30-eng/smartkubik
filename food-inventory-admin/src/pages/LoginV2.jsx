import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ShieldCheck, Lock, MessageCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/use-auth.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiBaseUrl } from '@/lib/api.js';
import { DUR, EASE, STAGGER, fadeUp } from '@/lib/motion';
import {
  getLastUser,
  setLastUser,
  clearLastUser,
  getStreak,
  recordLoginForStreak,
  getCachedStats,
} from '@/lib/loginCache.js';
import logoSmartKubik from '../assets/logo-smartkubik.png';
import logoSmartKubikLight from '../assets/logo-smartkubik-light.png';
import SalesContactModal from '@/components/SalesContactModal.jsx';
import LoginGreeting from '@/components/login/LoginGreeting.jsx';
import LoginButton from '@/components/login/LoginButton.jsx';
import LoginError from '@/components/login/LoginError.jsx';
import WelcomeBackStats from '@/components/login/WelcomeBackStats.jsx';
import StreakIndicator from '@/components/login/StreakIndicator.jsx';

const ROUTE_LABELS = {
  '/dashboard': 'Dashboard',
  '/agenda': 'Agenda de hoy',
  '/calendar': 'Agenda',
  '/orders': 'Pedidos',
  '/inventory': 'Inventario',
  '/products': 'Productos',
  '/customers': 'Clientes',
  '/suppliers': 'Proveedores',
  '/pos': 'Punto de Venta',
  '/reports': 'Reportes',
  '/accounting': 'Contabilidad',
};

const labelForRoute = (path) => {
  if (!path) return null;
  const exact = ROUTE_LABELS[path];
  if (exact) return exact;
  const head = `/${path.split('/').filter(Boolean)[0] || ''}`;
  return ROUTE_LABELS[head] || null;
};

const goHref = `${(() => {
  let base = getApiBaseUrl();
  if (base.endsWith('/api/v1')) base = base.slice(0, -7);
  return base;
})()}/api/v1/auth/google`;

function FieldShell({ children, focused }) {
  return (
    <motion.div
      animate={{
        boxShadow: focused
          ? '0 0 0 3px rgba(59, 130, 246, 0.18)'
          : '0 0 0 0px rgba(59, 130, 246, 0)',
      }}
      transition={{ duration: 0.15 }}
      className="rounded-md"
    >
      {children}
    </motion.div>
  );
}

function PasswordField({ value, onChange, onCapsLock, autoFocus, capsOn }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor="password" className="text-gray-700 dark:text-gray-200">
        Contraseña
      </Label>
      <FieldShell focused={focused}>
        <div className="relative">
          <Input
            id="password"
            type={show ? 'text' : 'password'}
            required
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => onCapsLock(e.getModifierState && e.getModifierState('CapsLock'))}
            onKeyUp={(e) => onCapsLock(e.getModifierState && e.getModifierState('CapsLock'))}
            autoFocus={autoFocus}
            className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white pr-10"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            tabIndex={-1}
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </FieldShell>
      <AnimatePresence>
        {capsOn && (
          <motion.p
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: DUR.fast }}
            className="text-xs text-amber-600 dark:text-amber-400"
          >
            Mayúsculas activadas
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmailField({ value, onChange, autoFocus, hint }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor="email" className="text-gray-700 dark:text-gray-200">
        Correo
      </Label>
      <FieldShell focused={focused}>
        <Input
          id="email"
          type="email"
          placeholder={hint || 'admin@example.com'}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus={autoFocus}
          className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white placeholder:text-gray-400"
        />
      </FieldShell>
    </div>
  );
}

function TrustFooter({ onContactSales }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-[11px] text-gray-500 dark:text-gray-400">
      <span className="inline-flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5" /> Cumplimiento SENIAT
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Lock className="h-3.5 w-3.5" /> Encriptación SSL
      </span>
      <button
        type="button"
        onClick={onContactSales}
        className="inline-flex items-center gap-1.5 hover:text-gray-700 hover:underline dark:hover:text-gray-200"
      >
        <MessageCircle className="h-3.5 w-3.5" /> Habla con ventas
      </button>
    </div>
  );
}

function GoogleButton() {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        window.location.href = goHref;
      }}
      className="w-full bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-white hover:bg-gray-50 hover:dark:bg-slate-700"
    >
      <img
        src="/assets/Google__G__logo.svg (1).png"
        alt="Google"
        className="mr-2 h-4 w-4"
      />
      Continuar con Google
    </Button>
  );
}

function Logo() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: DUR.base, ease: EASE.out }}
      className="flex justify-center"
    >
      <img src={logoSmartKubik} alt="SmartKubik" className="h-6 w-auto hidden dark:block" />
      <img src={logoSmartKubikLight} alt="SmartKubik" className="h-6 w-auto block dark:hidden" />
    </motion.div>
  );
}

function LoginV2() {
  const cachedUser = useMemo(() => getLastUser(), []);
  const [email, setEmail] = useState(cachedUser?.email || '');
  const [password, setPassword] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [error, setError] = useState('');
  const [errorKey, setErrorKey] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [capsOn, setCapsOn] = useState(false);
  const [isSalesModalOpen, setSalesModalOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  const {
    login,
    isMultiTenantEnabled,
    logout,
    getLastLocation,
  } = useAuth();
  const navigate = useNavigate();

  const isReturning = Boolean(cachedUser?.email);
  const streak = useMemo(() => (isReturning ? getStreak() : 0), [isReturning]);
  const cachedStats = useMemo(() => (isReturning ? getCachedStats() : null), [isReturning]);
  const lastRoute = useMemo(() => {
    if (!isReturning) return null;
    const path = typeof getLastLocation === 'function' ? getLastLocation() : null;
    if (!path || path === '/dashboard') return null;
    return path;
  }, [isReturning, getLastLocation]);

  const dismissError = () => {
    if (error) {
      setError('');
      setStatus('idle');
    }
  };

  const handleSwitchAccount = () => {
    clearLastUser();
    setEmail('');
    setPassword('');
    setError('');
    setStatus('idle');
    // soft-reload to flip into first-time mode without router complications
    window.location.reload();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('loading');

    const wasFirstTime = !cachedUser?.email;

    try {
      const result = await login(
        email,
        password,
        isMultiTenantEnabled ? undefined : tenantCode.trim().toUpperCase(),
      );

      const roleName = result?.user?.role?.name;

      if (isMultiTenantEnabled && Array.isArray(result?.memberships)) {
        const memberships = result.memberships;

        if (memberships.length === 0) {
          if (roleName === 'super_admin') {
            await celebrateAndNavigate(result, '/super-admin', wasFirstTime);
            return;
          }
          setStatus('error');
          setErrorKey((k) => k + 1);
          setError('Tu cuenta no tiene organizaciones activas asignadas. Contacta a tu administrador.');
          logout();
          return;
        }

        const activeMemberships = memberships.filter(
          (m) => m.status === 'active',
        );

        if (activeMemberships.length === 0) {
          if (roleName === 'super_admin') {
            await celebrateAndNavigate(result, '/super-admin', wasFirstTime);
            return;
          }
          setStatus('error');
          setErrorKey((k) => k + 1);
          setError('Todas tus organizaciones están inactivas. Contacta a tu administrador.');
          logout();
          return;
        }

        const dest = roleName === 'super_admin' ? '/super-admin' : '/organizations';
        await celebrateAndNavigate(result, dest, wasFirstTime);
        return;
      }

      if (!result?.success) {
        setStatus('error');
        setErrorKey((k) => k + 1);
        setError(result?.message || 'Credenciales incorrectas o error en el servidor.');
        return;
      }

      const dest = roleName === 'super_admin' ? '/super-admin' : '/organizations';
      await celebrateAndNavigate(result, dest, wasFirstTime);
    } catch (err) {
      console.error('Login error:', err);
      setStatus('error');
      setErrorKey((k) => k + 1);
      setError(err.message || 'Ocurrió un error inesperado.');
    }
  };

  const celebrateAndNavigate = async (result, dest, wasFirstTime) => {
    // Cache for next visit
    const userData = result?.user || {};
    const firstName =
      userData.firstName ||
      userData.name?.toString().trim().split(/\s+/)[0] ||
      '';
    const memberships = Array.isArray(result?.memberships) ? result.memberships : [];
    const primary =
      memberships.find((m) => m.isDefault) ||
      memberships[0] ||
      null;
    const tenantName =
      primary?.tenant?.name ||
      result?.tenant?.name ||
      cachedUser?.tenantName ||
      '';
    const vertical =
      primary?.tenant?.vertical ||
      primary?.tenant?.verticalProfile?.key ||
      result?.tenant?.vertical ||
      result?.tenant?.verticalProfile?.key ||
      cachedUser?.vertical ||
      '';
    setLastUser({
      email,
      firstName,
      tenantName,
      vertical,
      lastLoginAt: new Date().toISOString(),
    });
    recordLoginForStreak();

    setStatus('success');
    if (wasFirstTime) {
      setShowWelcome(true);
      await new Promise((r) => setTimeout(r, 1300));
    } else {
      await new Promise((r) => setTimeout(r, 320));
    }
    navigate(dest);
  };

  // The "Entrar a {tenant}" CTA — only shown when we have a tenant name
  // AND the email field still matches the cached account (otherwise the
  // tenant copy would be misleading).
  const ctaTenantName =
    isReturning && email.trim().toLowerCase() === cachedUser.email.toLowerCase()
      ? cachedUser.tenantName
      : '';

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50 dark:bg-background transition-colors duration-300">
      {/* Calm gradient background — replaces animated Boxes */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,rgba(59,130,246,0.18),transparent_45%),radial-gradient(circle_at_85%_75%,rgba(99,102,241,0.14),transparent_50%)] dark:bg-[radial-gradient(circle_at_15%_25%,rgba(59,130,246,0.22),transparent_50%),radial-gradient(circle_at_85%_75%,rgba(56,189,248,0.16),transparent_55%)]"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/0 to-white/30 dark:from-slate-950/40 dark:via-transparent dark:to-slate-950/30" />

      {/* Top-left logo */}
      <div className="absolute top-6 left-6 z-20">
        <img src={logoSmartKubik} alt="SmartKubik" className="h-7 w-auto hidden dark:block" />
        <img src={logoSmartKubikLight} alt="SmartKubik" className="h-7 w-auto block dark:hidden" />
      </div>

      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-background/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25, ease: EASE.out }}
              className="text-center px-8"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                ¡Bienvenido a SmartKubik!
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Tu prueba de 14 días empieza ahora.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 min-h-screen w-full">
        {isReturning ? (
          <ReturningLayout
            cachedUser={cachedUser}
            email={email}
            setEmail={(v) => {
              dismissError();
              setEmail(v);
            }}
            password={password}
            setPassword={(v) => {
              dismissError();
              setPassword(v);
            }}
            tenantCode={tenantCode}
            setTenantCode={setTenantCode}
            isMultiTenantEnabled={isMultiTenantEnabled}
            capsOn={capsOn}
            setCapsOn={setCapsOn}
            error={error}
            errorKey={errorKey}
            status={status}
            handleSubmit={handleSubmit}
            ctaTenantName={ctaTenantName}
            streak={streak}
            cachedStats={cachedStats}
            lastRoute={lastRoute}
            onSwitchAccount={handleSwitchAccount}
            onContactSales={() => setSalesModalOpen(true)}
          />
        ) : (
          <FirstTimeLayout
            email={email}
            setEmail={(v) => {
              dismissError();
              setEmail(v);
            }}
            password={password}
            setPassword={(v) => {
              dismissError();
              setPassword(v);
            }}
            tenantCode={tenantCode}
            setTenantCode={setTenantCode}
            isMultiTenantEnabled={isMultiTenantEnabled}
            capsOn={capsOn}
            setCapsOn={setCapsOn}
            error={error}
            errorKey={errorKey}
            status={status}
            handleSubmit={handleSubmit}
            onContactSales={() => setSalesModalOpen(true)}
          />
        )}
      </div>

      <SalesContactModal isOpen={isSalesModalOpen} onOpenChange={setSalesModalOpen} />
    </div>
  );
}

function ReturningLayout(props) {
  const {
    cachedUser,
    email,
    setEmail,
    password,
    setPassword,
    tenantCode,
    setTenantCode,
    isMultiTenantEnabled,
    capsOn,
    setCapsOn,
    error,
    errorKey,
    status,
    handleSubmit,
    ctaTenantName,
    streak,
    cachedStats,
    lastRoute,
    onSwitchAccount,
    onContactSales,
  } = props;

  const passwordRef = useRef(null);
  useEffect(() => {
    // Email is pre-filled, jump straight to password
    if (passwordRef.current) {
      passwordRef.current.querySelector('input')?.focus();
    }
  }, []);

  const lastRouteLabel = labelForRoute(lastRoute);

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-20">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200/70 bg-white/90 px-10 py-16 shadow-xl backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/60">
        <div className="mb-10">
          <Logo />
          <div className="mt-9">
            <LoginGreeting
              firstName={cachedUser.firstName}
              vertical={cachedUser.vertical}
            />
            <div className="mt-3 flex justify-center">
              <StreakIndicator days={streak} />
            </div>
          </div>
        </div>

        <WelcomeBackStats
          lastLoginAt={cachedUser.lastLoginAt}
          stats={cachedStats}
        />

        {lastRouteLabel && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.base, ease: EASE.out, delay: 0.4 }}
            className="mt-3 rounded-md border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300"
          >
            Última visita: <span className="font-medium">{lastRouteLabel}</span>
          </motion.div>
        )}

        <motion.form
          onSubmit={handleSubmit}
          variants={STAGGER(0.06, 0.2)}
          initial="initial"
          animate="animate"
          className="mt-10 space-y-6"
        >
          <motion.div variants={fadeUp}>
            <EmailField
              value={email}
              onChange={setEmail}
              hint={cachedUser.email}
              autoFocus={false}
            />
          </motion.div>
          <motion.div variants={fadeUp} ref={passwordRef}>
            <PasswordField
              value={password}
              onChange={setPassword}
              onCapsLock={setCapsOn}
              capsOn={capsOn}
              autoFocus
            />
            <div className="mt-1 flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </motion.div>

          {!isMultiTenantEnabled && (
            <motion.div variants={fadeUp} className="space-y-2">
              <Label
                htmlFor="tenantCode"
                className="text-gray-700 dark:text-gray-200"
              >
                Código de Tenant (Opcional)
              </Label>
              <Input
                id="tenantCode"
                type="text"
                placeholder="EJ: SMARTFOOD"
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white placeholder:text-gray-400"
              />
            </motion.div>
          )}

          <motion.div variants={fadeUp}>
            <LoginError message={status === 'error' ? error : ''} />
          </motion.div>

          <motion.div variants={fadeUp}>
            <LoginButton
              status={status}
              tenantName={ctaTenantName}
              errorKey={errorKey}
            />
          </motion.div>

          <motion.div variants={fadeUp} className="pt-2">
            <GoogleButton />
          </motion.div>
        </motion.form>

        <div className="mt-10 text-center text-xs text-gray-500 dark:text-gray-400">
          ¿No es tu cuenta?{' '}
          <button
            type="button"
            onClick={onSwitchAccount}
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Cambiar
          </button>
        </div>
        </div>

        <TrustFooter onContactSales={onContactSales} />
      </div>
    </div>
  );
}

function FirstTimeLayout(props) {
  const {
    email,
    setEmail,
    password,
    setPassword,
    tenantCode,
    setTenantCode,
    isMultiTenantEnabled,
    capsOn,
    setCapsOn,
    error,
    errorKey,
    status,
    handleSubmit,
    onContactSales,
  } = props;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Hero — 40% */}
      <div className="flex w-full items-center justify-center px-8 py-16 lg:w-[40%] lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DUR.slow, ease: EASE.out }}
          className="max-w-lg text-center lg:text-left"
        >
          <h1
            className="font-display text-4xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white md:text-5xl"
            style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
          >
            Tu negocio,<br />abierto siempre.
          </h1>
          <p className="mt-5 text-base text-gray-600 dark:text-gray-300 md:text-lg">
            Software modular para tiendas, salones, restaurantes, hoteles y clínicas. Se adapta y crece contigo.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3 lg:justify-start">
            <span className="text-amber-500">★★★★★</span>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              4.9/5 · 1,200+ negocios en LATAM
            </span>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link to="/register">
              <Button
                size="lg"
                className="bg-blue-600 px-7 py-5 text-base font-semibold text-white shadow-lg hover:bg-blue-700 hover:shadow-xl"
              >
                Crear cuenta gratis
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={onContactSales}
              className="border-gray-300 bg-white/80 px-6 py-5 text-sm font-semibold text-gray-900 hover:bg-gray-100 dark:border-slate-700 dark:bg-transparent dark:text-white dark:hover:bg-slate-800"
            >
              Habla con ventas
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Form — 60% */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-[60%] lg:px-16">
        <div className="w-full max-w-lg">
        <div className="w-full rounded-2xl border border-gray-200/70 bg-white/90 px-10 py-16 shadow-xl backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/60">
          <Logo />
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.base, ease: EASE.out, delay: 0.1 }}
            className="mt-9 text-center text-2xl font-bold text-gray-900 dark:text-white"
            style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
          >
            Inicia sesión
          </motion.h2>

          <motion.form
            onSubmit={handleSubmit}
            variants={STAGGER(0.06, 0.2)}
            initial="initial"
            animate="animate"
            className="mt-10 space-y-6"
          >
            <motion.div variants={fadeUp}>
              <EmailField value={email} onChange={setEmail} autoFocus />
            </motion.div>
            <motion.div variants={fadeUp}>
              <PasswordField
                value={password}
                onChange={setPassword}
                onCapsLock={setCapsOn}
                capsOn={capsOn}
              />
              <div className="mt-1 flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </motion.div>

            {!isMultiTenantEnabled && (
              <motion.div variants={fadeUp} className="space-y-2">
                <Label htmlFor="tenantCode" className="text-gray-700 dark:text-gray-200">
                  Código de Tenant (Opcional)
                </Label>
                <Input
                  id="tenantCode"
                  type="text"
                  placeholder="EJ: SMARTFOOD"
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                  className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white placeholder:text-gray-400"
                />
              </motion.div>
            )}

            <motion.div variants={fadeUp}>
              <LoginError message={status === 'error' ? error : ''} />
            </motion.div>

            <motion.div variants={fadeUp}>
              <LoginButton status={status} errorKey={errorKey} />
            </motion.div>

            <motion.div variants={fadeUp} className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-white px-3 text-gray-500 dark:bg-slate-900 dark:text-gray-400">
                  o
                </span>
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <GoogleButton />
            </motion.div>
          </motion.form>

          <div className="mt-10 text-center text-sm text-gray-600 dark:text-gray-300">
            ¿No tienes cuenta?{' '}
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Crear cuenta gratis →
            </Link>
          </div>
        </div>

        <TrustFooter onContactSales={onContactSales} />
        </div>
      </div>
    </div>
  );
}

export default LoginV2;
