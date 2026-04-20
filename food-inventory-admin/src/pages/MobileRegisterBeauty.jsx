import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Eye, EyeOff, Minus, Plus, ArrowRight, Loader2,
  Scissors, Sparkles, Hand, Flower2, User, Phone, Mail, Lock, Check,
} from 'lucide-react';
import { SPRING, EASE } from '@/lib/motion';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import haptics from '@/lib/haptics';
import { toast } from 'sonner';

// ════════════════════════════════════════════════════════
// DESIGN TOKENS (matching MobileOnboardingBeauty)
// ════════════════════════════════════════════════════════

const GRADIENT_PRIMARY = 'linear-gradient(135deg, #a855f7, #6366f1)';
const CTA_GLOW = '0 4px 24px -4px rgba(168,85,247,0.35)';
const PROGRESS_GRADIENT = 'linear-gradient(90deg, #a855f7, #6366f1)';
const PROGRESS_GLOW = '0 0 8px rgba(168,85,247,0.4)';

const INPUT_CLASS = `w-full py-4 px-5 rounded-2xl text-[16px] text-white placeholder:text-white/20
  bg-white/[0.04] focus:outline-none focus:bg-white/[0.06] transition-colors duration-300`;

// ════════════════════════���═════════════════════════��═════
// CONSTANTS
// ═════════════════════════════════════════════════���══════

const CATEGORIES = [
  {
    id: 'barbershop-salon',
    label: 'Barbería',
    specificCategory: 'Barbería / Peluquería',
    Icon: Scissors,
    gradient: ['#c084fc', '#a855f7'],
  },
  {
    id: 'nail-salon',
    label: 'Nail Studio',
    specificCategory: 'Nail Studio',
    Icon: Hand,
    gradient: ['#f472b6', '#ec4899'],
  },
  {
    id: 'spa-wellness',
    label: 'Spa',
    specificCategory: 'Spa / Centro Estético',
    Icon: Flower2,
    gradient: ['#38bdf8', '#0ea5e9'],
  },
  {
    id: 'beauty-salon',
    label: 'Salón de Belleza',
    specificCategory: 'Salón de Belleza',
    Icon: Sparkles,
    gradient: ['#4ade80', '#22c55e'],
  },
];

const BUILDING_STEPS = [
  { label: 'Cuenta creada', delay: 0 },
  { label: 'Configurando tu perfil', delay: 600 },
  { label: 'Preparando tu espacio', delay: 1400 },
  { label: 'Activando prueba gratuita', delay: 2200 },
];

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
};

// ═════════════��════════════════════════════════════���═════
// SHARED: CTA Button (pill, gradient)
// ═════════════════════════════════════════════���══════════

function CTAButton({ onClick, disabled, loading, children }) {
  const canContinue = !disabled && !loading;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE.out, delay: 0.3 }}
    >
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className="w-full py-4 rounded-full text-[15px] font-bold flex items-center justify-center gap-2 transition-all duration-400"
        style={{
          background: canContinue ? GRADIENT_PRIMARY : 'rgba(255,255,255,0.05)',
          color: canContinue ? 'white' : 'rgba(255,255,255,0.15)',
          boxShadow: canContinue ? CTA_GLOW : 'none',
        }}
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <>
            {children}
            {canContinue && <ArrowRight size={16} strokeWidth={2.5} />}
          </>
        )}
      </button>
    </motion.div>
  );
}

// ══════════════════════════��════════════════════════════��
// SCREEN 1: Salon Name + Category
// ════════════════════════════════════════════════���═══════

function StepSalonName({ data, onChange, onNext }) {
  const inputRef = useRef(null);
  const [shakeCategory, setShakeCategory] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleNext = () => {
    if (!data.businessName || data.businessName.trim().length < 2) {
      setError('Dale un nombre a tu salón');
      return;
    }
    if (!data.category) {
      setShakeCategory(true);
      setTimeout(() => setShakeCategory(false), 500);
      return;
    }
    setError('');
    onNext();
  };

  const canContinue = data.businessName?.trim().length >= 2 && data.category;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5 max-w-md mx-auto w-full pt-8 pb-4">
        {/* Brand mark — monogram style */}
        <motion.div
          className="flex items-center justify-center gap-3 mb-10"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE.out }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(99,102,241,0.1))' }}
          >
            <Scissors size={16} strokeWidth={1.5} className="text-purple-300" />
          </div>
          <span className="text-white/20 text-[12px] font-medium tracking-[0.2em] uppercase">SmartKubik</span>
        </motion.div>

        <motion.h1
          className="text-[32px] font-extrabold text-white leading-[1.15] tracking-tight text-center mb-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE.out, delay: 0.1 }}
        >
          ¿Cómo se llama{'\n'}tu salón?
        </motion.h1>

        <motion.p
          className="text-center text-white/35 text-[15px] mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          14 días gratis · Sin tarjeta
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE.out, delay: 0.25 }}
        >
          <input
            ref={inputRef}
            type="text"
            value={data.businessName}
            onChange={(e) => { onChange({ businessName: e.target.value }); setError(''); }}
            placeholder="Ej: Barbería El Pulpo"
            className={INPUT_CLASS}
          />
          {error && <p className="text-xs text-red-400/80 mt-2 ml-1">{error}</p>}
        </motion.div>

        <motion.p
          className="text-white/20 text-[10px] font-medium uppercase tracking-wide mt-10 mb-4 block text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          Tipo de negocio
        </motion.p>

        <motion.div
          className="grid grid-cols-2 gap-3"
          animate={shakeCategory ? { x: [0, -6, 6, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
          initial="hidden"
          whileInView="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.4 } } }}
        >
          {CATEGORIES.map((cat) => {
            const selected = data.category === cat.id;
            return (
              <motion.button
                key={cat.id}
                type="button"
                onClick={() => { onChange({ category: cat.id }); haptics.select(); }}
                className="relative flex flex-col items-center text-center rounded-3xl px-3 pt-5 pb-4 transition-all duration-300"
                style={{
                  background: selected
                    ? `linear-gradient(135deg, ${cat.gradient[0]}18, ${cat.gradient[1]}10)`
                    : 'rgba(255,255,255,0.03)',
                  boxShadow: selected
                    ? `0 0 0 1.5px ${cat.gradient[0]}60, 0 4px 20px -6px ${cat.gradient[0]}25`
                    : 'none',
                }}
                whileTap={{ scale: 0.96 }}
                variants={{ hidden: { opacity: 0, y: 16, scale: 0.95 }, show: { opacity: 1, y: 0, scale: 1 } }}
              >
                {/* Checkmark dot */}
                {selected && (
                  <motion.div
                    className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${cat.gradient[0]}, ${cat.gradient[1]})` }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <Check size={10} strokeWidth={3} className="text-white" />
                  </motion.div>
                )}

                {/* Icon orb */}
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{
                    background: selected
                      ? `linear-gradient(135deg, ${cat.gradient[0]}30, ${cat.gradient[1]}20)`
                      : 'rgba(255,255,255,0.05)',
                  }}
                >
                  <cat.Icon
                    size={22}
                    strokeWidth={1.5}
                    style={{ color: selected ? cat.gradient[0] : 'rgba(255,255,255,0.3)' }}
                  />
                </div>

                <span className={`text-[13px] font-medium ${selected ? 'text-white/90' : 'text-white/40'}`}>
                  {cat.label}
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      <div className="px-5 pb-8 pt-4 max-w-md mx-auto w-full">
        <CTAButton onClick={handleNext} disabled={!canContinue}>
          Continuar
        </CTAButton>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// SCREEN 2: Team Size (Stepper)
// ═══════════════════════════════════���════════════════════

function StepTeamSize({ data, onChange, onNext }) {
  const [bounce, setBounce] = useState(false);

  const handleChange = (delta) => {
    const next = Math.max(1, Math.min(20, data.numberOfUsers + delta));
    if (next !== data.numberOfUsers) {
      onChange({ numberOfUsers: next });
      haptics.tap();
      setBounce(true);
      setTimeout(() => setBounce(false), 150);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col justify-center px-5 max-w-md mx-auto w-full">
        <motion.h1
          className="text-[32px] font-extrabold text-white leading-[1.15] tracking-tight text-center mb-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE.out }}
        >
          ¿Cuántas sillas{'\n'}tienes?
        </motion.h1>
        <motion.p
          className="text-center text-white/35 text-[15px] mb-14"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          Incluye la tuya si también atiendes
        </motion.p>

        <motion.div
          className="flex items-center justify-center gap-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE.out, delay: 0.2 }}
        >
          <button
            onClick={() => handleChange(-1)}
            disabled={data.numberOfUsers <= 1}
            className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 disabled:opacity-20"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <Minus size={20} strokeWidth={1.5} className="text-white/60" />
          </button>

          <motion.span
            className="text-[56px] font-extrabold text-white tabular-nums min-w-[70px] text-center"
            animate={bounce ? { scale: 1.12 } : { scale: 1 }}
            transition={{ duration: 0.12 }}
          >
            {data.numberOfUsers}
          </motion.span>

          <button
            onClick={() => handleChange(1)}
            disabled={data.numberOfUsers >= 20}
            className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 disabled:opacity-20"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <Plus size={20} strokeWidth={1.5} className="text-white/60" />
          </button>
        </motion.div>
      </div>

      <div className="px-5 pb-8 pt-4 max-w-md mx-auto w-full">
        <CTAButton onClick={onNext}>
          Continuar
        </CTAButton>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// SCREEN 3: Personal Info
// ════════════════════════════════════════════════════════

function StepPersonalInfo({ data, onChange, onNext }) {
  const nameRef = useRef(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 300);
  }, []);

  const handleNext = () => {
    const errs = {};
    if (!data.firstName?.trim()) errs.firstName = 'Requerido';
    if (!data.phone?.trim()) errs.phone = 'Requerido';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    onNext();
  };

  const canContinue = data.firstName?.trim() && data.phone?.trim();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5 max-w-md mx-auto w-full pt-8 pb-4">
        <motion.h1
          className="text-[32px] font-extrabold text-white leading-[1.15] tracking-tight text-center mb-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE.out }}
        >
          ¿Cómo te llamas?
        </motion.h1>
        <motion.p
          className="text-center text-white/35 text-[15px] mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          Para personalizar tu cuenta
        </motion.p>

        <motion.div
          className="space-y-3 mb-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE.out, delay: 0.2 }}
        >
          <div className="relative">
            <User size={16} strokeWidth={1.5} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" />
            <input
              ref={nameRef}
              type="text"
              value={data.firstName}
              onChange={(e) => { onChange({ firstName: e.target.value }); setErrors(p => ({...p, firstName: ''})); }}
              placeholder="Tu nombre"
              className={INPUT_CLASS + ' pl-12'}
            />
            {errors.firstName && <p className="text-xs text-red-400/80 mt-1 ml-1">{errors.firstName}</p>}
          </div>
          <input
            type="text"
            value={data.lastName}
            onChange={(e) => onChange({ lastName: e.target.value })}
            placeholder="Tu apellido (opcional)"
            className={INPUT_CLASS}
          />
        </motion.div>

        <motion.p
          className="text-white/20 text-[10px] font-medium uppercase tracking-wide mb-3 block text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          Tu WhatsApp
        </motion.p>

        <motion.div
          className="flex gap-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE.out, delay: 0.4 }}
        >
          <div className="py-4 px-4 rounded-2xl bg-white/[0.04] text-white/35 text-[15px] shrink-0 flex items-center">
            +58
          </div>
          <div className="flex-1 relative">
            <Phone size={16} strokeWidth={1.5} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" />
            <input
              type="tel"
              inputMode="tel"
              value={data.phone}
              onChange={(e) => { onChange({ phone: e.target.value }); setErrors(p => ({...p, phone: ''})); }}
              placeholder="0414 123 4567"
              className={INPUT_CLASS + ' pl-12'}
            />
            {errors.phone && <p className="text-xs text-red-400/80 mt-1 ml-1">{errors.phone}</p>}
          </div>
        </motion.div>
      </div>

      <div className="px-5 pb-8 pt-4 max-w-md mx-auto w-full">
        <CTAButton onClick={handleNext} disabled={!canContinue}>
          Continuar
        </CTAButton>
      </div>
    </div>
  );
}

// ══════════════════════════════════���═════════════════════
// SCREEN 4: Account (Email + Password)
// ═══════════════════════════════════════���════════════════

function StepAccount({ data, onChange, onSubmit, isLoading }) {
  const emailRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setTimeout(() => emailRef.current?.focus(), 300);
  }, []);

  const passwordChecks = [
    { label: '8+ caracteres', met: (data.password || '').length >= 8 },
    { label: 'Al menos una letra', met: /[a-zA-Z]/.test(data.password || '') },
    { label: 'Al menos un número', met: /\d/.test(data.password || '') },
  ];

  const allChecksMet = passwordChecks.every(c => c.met);

  const handleSubmit = () => {
    const errs = {};
    if (!data.email?.trim()) errs.email = 'Requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errs.email = 'Email inválido';
    if (!allChecksMet) errs.password = 'Completa los requisitos';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    haptics.impact();
    onSubmit();
  };

  const canSubmit = data.email?.trim() && allChecksMet;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5 max-w-md mx-auto w-full pt-8 pb-4">
        <motion.h1
          className="text-[32px] font-extrabold text-white leading-[1.15] tracking-tight text-center mb-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE.out }}
        >
          Tu cuenta
        </motion.h1>
        <motion.p
          className="text-center text-white/35 text-[15px] mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          Con esto inicias sesión
        </motion.p>

        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE.out, delay: 0.2 }}
        >
          <div className="relative">
            <Mail size={16} strokeWidth={1.5} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" />
            <input
              ref={emailRef}
              type="email"
              inputMode="email"
              autoCapitalize="none"
              value={data.email}
              onChange={(e) => { onChange({ email: e.target.value.toLowerCase() }); setErrors(p => ({...p, email: ''})); }}
              placeholder="tu@email.com"
              className={INPUT_CLASS + ' pl-12'}
            />
          </div>
          {errors.email && <p className="text-xs text-red-400/80 mt-2 ml-1">{errors.email}</p>}
        </motion.div>

        <motion.p
          className="text-white/20 text-[10px] font-medium uppercase tracking-wide mb-3 block text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          Contraseña
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE.out, delay: 0.4 }}
        >
          <div className="relative">
            <Lock size={16} strokeWidth={1.5} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={data.password}
              onChange={(e) => { onChange({ password: e.target.value }); setErrors(p => ({...p, password: ''})); }}
              placeholder="Mínimo 8 caracteres"
              className={INPUT_CLASS + ' pl-12 pr-12'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors"
            >
              {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
            </button>
          </div>

          <div className="mt-4 space-y-2.5 ml-1">
            {passwordChecks.map((check, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    background: check.met ? GRADIENT_PRIMARY : 'transparent',
                    boxShadow: check.met
                      ? '0 2px 8px rgba(168,85,247,0.4)'
                      : 'inset 0 0 0 1.5px rgba(255,255,255,0.12)',
                  }}
                >
                  {check.met && (
                    <motion.svg
                      width="8" height="8" viewBox="0 0 12 12" fill="none"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </motion.svg>
                  )}
                </div>
                <span className={`text-[13px] ${check.met ? 'text-white/60' : 'text-white/25'}`}>
                  {check.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="px-5 pb-8 pt-4 max-w-md mx-auto w-full">
        <CTAButton onClick={handleSubmit} disabled={!canSubmit} loading={isLoading}>
          Crear mi salón
        </CTAButton>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// SCREEN 5: Building → Celebration
// ════════════════════════════════════════════════════════

function StepCelebration({ data, email, onConfirm }) {
  const [completedSteps, setCompletedSteps] = useState([]);
  const [phase, setPhase] = useState('building');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    BUILDING_STEPS.forEach((step, i) => {
      setTimeout(() => {
        setCompletedSteps(prev => [...prev, i]);
        setProgress(((i + 1) / BUILDING_STEPS.length) * 100);
      }, step.delay);
    });

    setTimeout(() => {
      setPhase('complete');
      haptics.success();
    }, 2800);
  }, []);

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);
  const trialEndStr = trialEnd.toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' });

  if (phase === 'building') {
    return (
      <div className="flex flex-col h-full items-center justify-center px-5">
        {/* Ambient orb */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 65%)', filter: 'blur(50px)' }}
        />

        <div className="max-w-md w-full text-center relative z-10">
          {/* Monogram */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(99,102,241,0.1))' }}
          >
            <span className="text-purple-300 text-lg font-bold">
              {(data.businessName || 'S').charAt(0).toUpperCase()}
            </span>
          </div>

          <h2 className="text-[22px] font-bold text-white mb-1">{data.businessName}</h2>
          <p className="text-[14px] text-white/35 mb-10">Creando tu salón...</p>

          {/* Progress bar */}
          <div className="w-full h-[3px] bg-white/[0.04] rounded-full overflow-hidden mb-10">
            <motion.div
              className="h-full rounded-full"
              style={{ background: PROGRESS_GRADIENT, boxShadow: PROGRESS_GLOW }}
              animate={{ width: `${progress}%` }}
              transition={SPRING.soft}
            />
          </div>

          {/* Checklist */}
          <div className="space-y-4 text-left max-w-[260px] mx-auto">
            {BUILDING_STEPS.map((step, i) => {
              const done = completedSteps.includes(i);
              const active = i === completedSteps.length;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
                    style={{
                      background: done ? GRADIENT_PRIMARY : 'transparent',
                      boxShadow: done
                        ? '0 2px 8px rgba(168,85,247,0.4)'
                        : active
                          ? 'inset 0 0 0 1.5px rgba(168,85,247,0.5)'
                          : 'inset 0 0 0 1.5px rgba(255,255,255,0.08)',
                    }}
                  >
                    {done && (
                      <motion.svg
                        width="10" height="10" viewBox="0 0 12 12" fill="none"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      >
                        <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </motion.svg>
                    )}
                    {active && !done && <Loader2 size={10} className="text-purple-400 animate-spin" />}
                  </div>
                  <span className={`text-[14px] ${done ? 'text-white/70' : active ? 'text-white/50' : 'text-white/20'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Phase: complete
  return (
    <div className="flex flex-col h-full items-center justify-center px-5">
      {/* Ambient orb */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 60%)', filter: 'blur(50px)' }}
      />

      <div className="max-w-md w-full text-center relative z-10">
        {/* Success orb */}
        <motion.div
          className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg, rgba(74,222,128,0.15), rgba(34,197,94,0.1))' }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Check size={28} strokeWidth={1.5} className="text-emerald-400" />
        </motion.div>

        <motion.h1
          className="text-[32px] font-extrabold text-white leading-[1.15] tracking-tight mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Todo listo
        </motion.h1>

        <motion.div
          className="space-y-1 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-white/70 font-medium text-[16px]">{data.businessName}</p>
          <p className="text-[14px] text-white/35">Prueba gratuita · 14 días</p>
          <p className="text-[13px] text-white/25">Vence: {trialEndStr}</p>
        </motion.div>

        <motion.div
          className="rounded-2xl px-5 py-4 mb-10"
          style={{ background: 'rgba(255,255,255,0.03)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-[14px] text-white/50">
            Te enviamos un código de confirmación a
          </p>
          <p
            className="text-[14px] font-medium mt-1"
            style={{
              background: 'linear-gradient(135deg, #c084fc, #818cf8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {email}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <button
            onClick={onConfirm}
            className="w-full py-4 rounded-full text-[15px] font-bold flex items-center justify-center gap-2"
            style={{ background: GRADIENT_PRIMARY, boxShadow: CTA_GLOW }}
          >
            Confirmar mi cuenta
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        </motion.div>
      </div>
    </div>
  );
}

// ════════════════════════════��═══════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════���══════

export default function MobileRegisterBeauty() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithTokens } = useAuth();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [registrationResponse, setRegistrationResponse] = useState(null);

  const prefilledCategory = location.state?.category || null;

  const [formData, setFormData] = useState({
    businessName: '',
    category: prefilledCategory,
    numberOfUsers: 1,
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
  });

  const updateData = (partial) => setFormData(prev => ({ ...prev, ...partial }));

  const goNext = () => {
    setDirection(1);
    setStep(s => s + 1);
  };

  const goBack = () => {
    if (step === 1) {
      navigate('/skubik');
      return;
    }
    setDirection(-1);
    setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setDirection(1);
    setStep(5);

    try {
      const categoryObj = CATEGORIES.find(c => c.id === formData.category);

      // Phone: normalize to E.164 format (+58XXXXXXXXXX)
      const rawPhone = formData.phone.replace(/[\s\-()]/g, '');
      const phone = rawPhone.startsWith('+')
        ? rawPhone
        : `+58${rawPhone.replace(/^0/, '')}`;

      const payload = {
        businessName: formData.businessName.trim(),
        numberOfUsers: formData.numberOfUsers,
        vertical: 'SERVICES',
        firstName: formData.firstName.trim(),
        lastName: formData.lastName?.trim() || '-',
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        businessType: categoryObj?.id || 'barbershop-salon',
        subscriptionPlan: 'trial',
      };

      // Only include phone if user actually typed something
      if (rawPhone.length >= 7) {
        payload.phone = phone;
      }

      const response = await fetchApi('/onboarding/register', {
        method: 'POST',
        body: JSON.stringify(payload),
        isPublic: true,
      });

      const authResult = await loginWithTokens(response);
      setRegistrationResponse(response);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      setStep(4);
      setDirection(-1);

      const msg = err?.message || err?.error || '';
      if (msg.includes('already') || msg.includes('existe') || msg.includes('duplicate') || msg.includes('already registered')) {
        toast.error('Este correo ya tiene cuenta. ¿Quieres iniciar sesión?', {
          action: { label: 'Ir a login', onClick: () => navigate('/login') },
        });
      } else if (msg.includes('rate') || msg.includes('limit')) {
        toast.error('Demasiados intentos. Espera un momento.');
      } else {
        console.error('Registration error:', msg);
        toast.error(msg || 'Algo salió mal. Intenta de nuevo.');
      }
    }
  };

  const handleConfirm = () => {
    navigate('/confirm-account', {
      state: {
        email: formData.email,
        plan: 'trial',
        tenant: registrationResponse?.tenant,
      },
    });
  };

  const totalSteps = 5;
  const progressPct = (step / totalSteps) * 100;

  return (
    <div className="fixed inset-0 bg-[#0a0e1a] flex flex-col overflow-hidden">
      {/* Subtle ambient gradient — same as onboarding */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(168,85,247,0.05) 0%, transparent 60%)' }}
      />

      {/* Progress bar */}
      <div className="w-full h-[2px] bg-white/[0.04] flex-shrink-0 relative z-10">
        <motion.div
          className="h-full rounded-r-full"
          style={{ background: PROGRESS_GRADIENT, boxShadow: PROGRESS_GLOW }}
          initial={false}
          animate={{ width: `${progressPct}%` }}
          transition={SPRING.soft}
        />
      </div>

      {/* Header (back button) */}
      {step < 5 && (
        <motion.div
          className="relative z-10 flex items-center px-5 pt-4 pb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <button
            onClick={goBack}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <ChevronLeft size={18} strokeWidth={1.5} className="text-white/40" />
          </button>
        </motion.div>
      )}

      {/* Step content */}
      <div className="relative z-10 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: EASE.out }}
            className="absolute inset-0"
          >
            {step === 1 && (
              <StepSalonName data={formData} onChange={updateData} onNext={goNext} />
            )}
            {step === 2 && (
              <StepTeamSize data={formData} onChange={updateData} onNext={goNext} />
            )}
            {step === 3 && (
              <StepPersonalInfo data={formData} onChange={updateData} onNext={goNext} />
            )}
            {step === 4 && (
              <StepAccount data={formData} onChange={updateData} onSubmit={handleSubmit} isLoading={isLoading} />
            )}
            {step === 5 && (
              <StepCelebration data={formData} email={formData.email} onConfirm={handleConfirm} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
