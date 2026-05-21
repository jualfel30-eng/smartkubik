import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronRight, AlertTriangle, BookOpen, Receipt, RefreshCw,
  School, Users, CheckSquare, GraduationCap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { useEduDashboard } from '@/hooks/use-edu-dashboard';
import { listItem, STAGGER, DUR, EASE } from '@/lib/motion';
import { useReducedMotionSafe } from '@/hooks/use-reduced-motion-safe';
import haptics from '@/lib/haptics';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber.jsx';

function AlertCard({ icon: Icon, color, label, onAction }) {
  const colorMap = {
    red:    { bg: 'rgb(239 68 68 / 0.08)',   icon: 'text-destructive', ring: 'rgb(239 68 68 / 0.15)' },
    blue:   { bg: 'rgb(59 130 246 / 0.08)',  icon: 'text-blue-500',    ring: 'rgb(59 130 246 / 0.15)' },
    amber:  { bg: 'rgb(245 158 11 / 0.08)',  icon: 'text-amber-500',   ring: 'rgb(245 158 11 / 0.15)' },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <button
      type="button"
      onClick={onAction}
      className="flex items-center gap-3 w-full text-left no-tap-highlight px-4 py-3"
      style={{ borderRadius: 'var(--mobile-radius-xl)', background: c.bg }}
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: c.ring }}>
        <Icon size={15} strokeWidth={1.5} className={c.icon} />
      </div>
      <span className="flex-1 text-[13px] text-foreground/80">{label}</span>
      <ChevronRight size={14} strokeWidth={1.5} className="text-muted-foreground/30 shrink-0" />
    </button>
  );
}

function ClassroomCard({ classroom, isTop }) {
  const navigate = useNavigate();
  const presentCount = classroom.presentToday ?? 0;
  const totalStudents = classroom.totalStudents ?? 0;
  const delinquent = classroom.delinquentCount ?? 0;
  return (
    <motion.button
      type="button"
      variants={listItem}
      whileTap={{ scale: 0.98 }}
      onClick={() => { haptics.tap(); navigate(`/education/classrooms/${classroom._id}/roster`); }}
      className="relative w-full text-left p-4 flex items-center gap-3.5 no-tap-highlight"
      style={{
        borderRadius: 'var(--mobile-radius-xl)',
        background: 'var(--glass-subtle)',
        boxShadow: isTop ? 'var(--ring-active-glow)' : 'var(--elevation-rest)',
      }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'var(--glass-subtle)' }}>
        <School size={18} strokeWidth={1.5} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold truncate">
          {classroom.grade} {classroom.section}
        </p>
        <p className="text-[12px] text-muted-foreground/60 truncate mt-0.5">
          {classroom.tutorName ? `Prof. ${classroom.tutorName}` : 'Sin tutor'} · {presentCount}/{totalStudents} presentes
          {delinquent > 0 && ` · ${delinquent} morosos`}
        </p>
      </div>
      <ChevronRight size={14} strokeWidth={1.5} className="text-muted-foreground/30 shrink-0" />
    </motion.button>
  );
}

export default function EduDashboard() {
  const { tenant } = useAuth();
  const { summary, loading, error, load } = useEduDashboard();
  const navigate = useNavigate();
  const { v: rv } = useReducedMotionSafe();

  useEffect(() => { load(); }, [load]);

  const hourNow = new Date().getHours();
  const greeting = hourNow < 12 ? 'Buenos días' : hourNow < 19 ? 'Buenas tardes' : 'Buenas noches';
  const ownerName = tenant?.ownerFirstName || 'Director';

  const alerts = [];
  if (summary?.overdueFeesCount > 0)
    alerts.push({ id: 'overdue', icon: Receipt, color: 'red', label: `${summary.overdueFeesCount} cuotas vencidas >30 días`, to: '/education/tuition?status=overdue' });
  if (summary?.unpublishedGradePeriods > 0)
    alerts.push({ id: 'grades', icon: BookOpen, color: 'blue', label: `${summary.unpublishedGradePeriods} lapsos sin publicar`, to: '/education/grades' });
  if (summary?.feesdueSoon > 0)
    alerts.push({ id: 'due-soon', icon: AlertTriangle, color: 'amber', label: `${summary.feesdueSoon} cuotas vencen esta semana`, to: '/education/tuition' });

  const classrooms = summary?.classroomsToday ?? [];
  const topClassroomId = classrooms.reduce((best, c) => {
    const rate = (c.totalStudents || 0) > 0 ? (c.presentToday || 0) / c.totalStudents : 0;
    return rate > (best.rate || 0) ? { id: c._id, rate } : best;
  }, {}).id;

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-48 bg-muted rounded-full" />
          <div className="h-32 bg-muted rounded-[var(--mobile-radius-lg)]" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="p-6 space-y-6 max-w-4xl mx-auto"
      initial="initial"
      animate="animate"
      variants={rv(STAGGER(0.05, 0.05))}
    >
      {/* Header */}
      <motion.div variants={listItem} className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-muted-foreground/60 font-medium tracking-wide capitalize">
            {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
          </p>
          <h1 className="text-[24px] font-extrabold leading-tight tracking-tight mt-0.5">
            {greeting}, {ownerName}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => { haptics.tap(); load(); }}
          aria-label="Actualizar"
          className="tap-target no-tap-highlight text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          <RefreshCw size={16} strokeWidth={1.5} />
        </button>
      </motion.div>

      {/* KPI grid */}
      <motion.div
        variants={listItem}
        className="bg-card p-5"
        style={{ borderRadius: 'var(--mobile-radius-xl)', boxShadow: 'var(--elevation-raised)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap size={16} strokeWidth={1.5} className="text-primary" />
          <p className="text-[13px] font-semibold text-foreground/80">Resumen académico</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Alumnos activos',  value: summary?.activeStudents ?? 0,      color: 'text-foreground' },
            { label: 'Solventes',         value: summary?.solventStudents ?? 0,     color: 'text-emerald-500' },
            { label: 'Morosos',           value: summary?.delinquentStudents ?? 0,  color: 'text-destructive' },
            { label: 'Asistencia hoy %', value: summary?.attendanceRateToday ?? 0, color: 'text-blue-500', pct: true },
          ].map((stat) => (
            <div key={stat.label} className="text-center rounded-xl py-3"
              style={{ background: 'var(--glass-subtle)' }}>
              <div className={`text-[22px] font-extrabold tabular-nums ${stat.color}`}>
                <AnimatedNumber
                  value={Number(stat.value)}
                  format={stat.pct ? (n) => `${n.toFixed(0)}%` : undefined}
                />
              </div>
              <div className="text-[10px] text-muted-foreground/60 font-medium mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <motion.div variants={STAGGER(0.04)} className="space-y-2">
          {alerts.map(a => (
            <motion.div key={a.id} variants={listItem}>
              <AlertCard icon={a.icon} color={a.color} label={a.label}
                onAction={() => { haptics.tap(); navigate(a.to); }} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Classrooms today */}
      {classrooms.length > 0 && (
        <motion.section variants={listItem}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold text-foreground/80 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--glass-subtle)' }}>
                <Users size={12} strokeWidth={1.5} className="text-primary" />
              </div>
              Salones hoy
            </h2>
            <button
              type="button"
              onClick={() => navigate('/education/classrooms')}
              className="text-[11px] text-primary/70 font-medium no-tap-highlight hover:text-primary transition-colors"
            >
              Ver todos
            </button>
          </div>
          <motion.div className="space-y-2" variants={STAGGER(0.035)}>
            {classrooms.map(c => (
              <ClassroomCard key={c._id} classroom={c} isTop={c._id === topClassroomId} />
            ))}
          </motion.div>
        </motion.section>
      )}

      {/* Quick nav */}
      <motion.section variants={listItem}>
        <h2 className="text-[13px] font-semibold text-foreground/80 mb-3">Acceso rápido</h2>
        <motion.div className="grid grid-cols-2 gap-3 sm:grid-cols-4" variants={STAGGER(0.04)}>
          {[
            { label: 'Salones',        icon: School,      to: '/education/classrooms',  gradient: ['#c084fc', '#a855f7'] },
            { label: 'Asistencia',     icon: CheckSquare, to: '/education/attendance',  gradient: ['#4ade80', '#22c55e'] },
            { label: 'Calificaciones', icon: BookOpen,    to: '/education/grades',      gradient: ['#38bdf8', '#0ea5e9'] },
            { label: 'Cuotas',         icon: Receipt,     to: '/education/tuition',     gradient: ['#fb923c', '#f97316'] },
          ].map(item => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.to}
                type="button"
                variants={listItem}
                whileTap={{ scale: 0.97 }}
                onClick={() => { haptics.tap(); navigate(item.to); }}
                className="bg-card p-4 flex flex-col items-start gap-3 no-tap-highlight"
                style={{ borderRadius: 'var(--mobile-radius-xl)', boxShadow: 'var(--elevation-rest)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${item.gradient[0]}18, ${item.gradient[1]}10)` }}
                >
                  <Icon size={18} strokeWidth={1.5} style={{ color: item.gradient[0] }} />
                </div>
                <span className="text-[13px] font-semibold text-foreground/80">{item.label}</span>
              </motion.button>
            );
          })}
        </motion.div>
      </motion.section>
    </motion.div>
  );
}
