import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { X, Clock, AlertTriangle, Flame } from 'lucide-react';

const DISMISS_KEY = 'trialBannerDismissed';

export default function TrialBanner() {
  const { tenant } = useAuth();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === 'true',
  );

  if (dismissed) return null;
  if (!tenant) return null;
  if (tenant.subscriptionPlan !== 'Trial') return null;
  if (!tenant.trialEndDate) return null;

  const now = new Date();
  const endDate = new Date(tenant.trialEndDate);
  const daysRemaining = Math.max(
    0,
    Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  let colorClasses, Icon, message, ctaText;

  if (daysRemaining >= 8) {
    colorClasses = 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300';
    Icon = Clock;
    message = (
      <>
        Te quedan <strong>{daysRemaining} días</strong> de prueba gratuita.
        ¿Sabías que puedes bloquear tu precio de por vida como Cliente Fundador?
      </>
    );
    ctaText = 'Ver programa';
  } else if (daysRemaining >= 3) {
    colorClasses = 'border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300';
    Icon = AlertTriangle;
    message = (
      <>
        Te quedan <strong>{daysRemaining} días</strong> de prueba.
        Asegura hasta 51% de descuento de por vida antes de que se acaben los cupos.
      </>
    );
    ctaText = 'Elegir plan de Fundador';
  } else {
    colorClasses = 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300';
    Icon = Flame;
    message = (
      <>
        Tu prueba termina en <strong>{daysRemaining === 0 ? 'menos de 24 horas' : `${daysRemaining} día${daysRemaining !== 1 ? 's' : ''}`}</strong>.
      </>
    );
    ctaText = 'Asegurar mi precio';
  }

  return (
    <div className={`relative flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${colorClasses}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <Link
        to="/fundadores"
        className="shrink-0 rounded-md bg-current/10 px-3 py-1.5 text-xs font-semibold hover:bg-current/20 transition-colors whitespace-nowrap"
      >
        {ctaText} &rarr;
      </Link>
      <button
        onClick={handleDismiss}
        className="shrink-0 rounded p-1 hover:bg-current/10 transition-colors"
        aria-label="Cerrar banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
