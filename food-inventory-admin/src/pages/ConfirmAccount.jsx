import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Check, ShieldAlert, Loader2, ArrowRight } from 'lucide-react';
import { EASE } from '@/lib/motion';
import { useAuth } from '@/hooks/use-auth';
import { fetchApi } from '@/lib/api';
import haptics from '@/lib/haptics';

const GRADIENT_PRIMARY = 'linear-gradient(135deg, #a855f7, #6366f1)';
const CTA_GLOW = '0 4px 24px -4px rgba(168,85,247,0.35)';

function ConfirmAccount() {
  const location = useLocation();
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();
  const inputRef = useRef(null);

  const tenantFromState = location.state?.tenant;
  const emailFromState = location.state?.email;
  const planFromState = location.state?.plan;

  const [email] = useState(emailFromState || '');
  const [code, setCode] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // If no email/tenant from state, show error with matching aesthetic
  if (!emailFromState || !tenantFromState) {
    return (
      <div className="fixed inset-0 bg-[#0a0e1a] flex flex-col items-center justify-center px-5">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(168,85,247,0.05) 0%, transparent 60%)' }}
        />
        <div className="relative z-10 max-w-md w-full text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'linear-gradient(135deg, rgba(251,146,60,0.15), rgba(249,115,22,0.1))' }}
          >
            <ShieldAlert size={24} strokeWidth={1.5} className="text-orange-400" />
          </div>
          <h1 className="text-[28px] font-extrabold text-white leading-[1.15] tracking-tight mb-3">
            Enlace inválido
          </h1>
          <p className="text-[15px] text-white/35 mb-8">
            No pudimos cargar la información del registro. Intenta registrarte nuevamente.
          </p>
          <button
            onClick={() => navigate('/register/beauty')}
            className="w-full py-4 rounded-full text-[15px] font-bold flex items-center justify-center gap-2"
            style={{ background: GRADIENT_PRIMARY, boxShadow: CTA_GLOW }}
          >
            Volver al registro
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    );
  }

  const tenantId = tenantFromState.id || tenantFromState._id;
  const tenantCode = tenantFromState.code;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!code || !email || (!tenantId && !tenantCode)) {
      setError('Información incompleta para confirmar la cuenta.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const payload = { email, confirmationCode: code };
      if (tenantId) payload.tenantId = tenantId;
      if (tenantCode) payload.tenantCode = tenantCode;

      const response = await fetchApi('/onboarding/confirm', {
        method: 'POST',
        body: JSON.stringify(payload),
        isPublic: true,
      });

      setSuccess(true);
      haptics.success();
      await loginWithTokens(response);

      // Always go to /dashboard — ProtectedRoute will redirect to /onboarding if needed
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
    } catch (err) {
      console.error('Confirm error:', err);
      setError(err.message || 'No fue posible confirmar la cuenta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0a0e1a] flex flex-col overflow-hidden">
      {/* Ambient gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(168,85,247,0.05) 0%, transparent 60%)' }}
      />

      {/* Progress bar (full) */}
      <div className="w-full h-[2px] bg-white/[0.04] flex-shrink-0 relative z-10">
        <div
          className="h-full w-full rounded-r-full"
          style={{
            background: 'linear-gradient(90deg, #a855f7, #6366f1)',
            boxShadow: '0 0 8px rgba(168,85,247,0.4)',
          }}
        />
      </div>

      {/* Back button */}
      <motion.div
        className="relative z-10 flex items-center px-5 pt-4 pb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <ChevronLeft size={18} strokeWidth={1.5} className="text-white/40" />
        </button>
      </motion.div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5">
        <div className="max-w-md w-full">
          {success ? (
            // Success state
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6"
                style={{ background: 'linear-gradient(135deg, rgba(74,222,128,0.15), rgba(34,197,94,0.1))' }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Check size={28} strokeWidth={1.5} className="text-emerald-400" />
              </motion.div>
              <h1 className="text-[32px] font-extrabold text-white leading-[1.15] tracking-tight mb-3">
                Cuenta confirmada
              </h1>
              <p className="text-[15px] text-white/35">
                Redirigiendo a tu salón...
              </p>
            </motion.div>
          ) : (
            // Form state
            <>
              <motion.h1
                className="text-[32px] font-extrabold text-white leading-[1.15] tracking-tight text-center mb-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE.out }}
              >
                Confirma tu cuenta
              </motion.h1>

              <motion.p
                className="text-center text-white/35 text-[15px] mb-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                Ingresa el código de 6 dígitos que enviamos a{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #c084fc, #818cf8)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {email}
                </span>
              </motion.p>

              <form onSubmit={handleSubmit}>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE.out, delay: 0.25 }}
                >
                  <p className="text-white/20 text-[10px] font-medium uppercase tracking-wide mb-3 block text-center">
                    Código de confirmación
                  </p>
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setCode(val);
                      setError('');
                    }}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full py-4 px-5 rounded-2xl text-[24px] text-white text-center font-bold tracking-[0.3em] placeholder:text-white/10 placeholder:tracking-[0.3em] bg-white/[0.04] focus:outline-none focus:bg-white/[0.06] transition-colors duration-300 tabular-nums"
                    autoComplete="one-time-code"
                  />
                  <p className="text-[12px] text-white/20 mt-3 text-center">
                    El código expira en 1 hora
                  </p>
                </motion.div>

                {error && (
                  <motion.div
                    className="flex items-center gap-2 rounded-2xl px-4 py-3 mt-6"
                    style={{ background: 'rgba(239,68,68,0.08)' }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <ShieldAlert size={14} strokeWidth={1.5} className="text-red-400 shrink-0" />
                    <span className="text-[13px] text-red-400/80">{error}</span>
                  </motion.div>
                )}

                <motion.div
                  className="mt-8"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE.out, delay: 0.4 }}
                >
                  <button
                    type="submit"
                    disabled={isSubmitting || code.length < 6}
                    className="w-full py-4 rounded-full text-[15px] font-bold flex items-center justify-center gap-2 transition-all duration-400"
                    style={{
                      background: code.length === 6 && !isSubmitting
                        ? GRADIENT_PRIMARY
                        : 'rgba(255,255,255,0.05)',
                      color: code.length === 6 && !isSubmitting
                        ? 'white'
                        : 'rgba(255,255,255,0.15)',
                      boxShadow: code.length === 6 && !isSubmitting
                        ? CTA_GLOW
                        : 'none',
                    }}
                  >
                    {isSubmitting ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        Confirmar cuenta
                        {code.length === 6 && <ArrowRight size={16} strokeWidth={2.5} />}
                      </>
                    )}
                  </button>
                </motion.div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConfirmAccount;
