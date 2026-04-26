import { motion } from 'framer-motion';
import { fadeUp } from '@/lib/motion';

function getGreeting(hour) {
  if (hour < 12) return 'Buenos dias';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function formatDate() {
  return new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
}

function formatTime(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('es', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export default function DashboardGreeting({ user, tenant, lastUpdated }) {
  const hour = new Date().getHours();
  const greeting = getGreeting(hour);
  const firstName = user?.firstName || 'Usuario';
  const tenantName = tenant?.name || '';

  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      className="flex flex-col md:flex-row md:justify-between md:items-start"
    >
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {formatDate()}{tenantName ? ` · ${tenantName}` : ''}
        </p>
      </div>
      {lastUpdated && (
        <div className="text-right mt-2 md:mt-0">
          <p className="text-xs text-muted-foreground">Ultima actualizacion</p>
          <p className="text-sm text-muted-foreground font-medium">{formatTime(lastUpdated)}</p>
        </div>
      )}
    </motion.div>
  );
}
