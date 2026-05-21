import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SPRING, STAGGER, listItem } from '@/lib/motion';
const STEPS = [
  { key: 'structuresAssigned', label: 'Estructuras salariales asignadas', route: '/payroll/structures' },
  { key: 'absencesResolved', label: 'Ausencias del período resueltas', route: '/hr/asistencia' },
  { key: 'clockDataReviewed', label: 'Registros de tiempo revisados', route: '/hr/asistencia' },
  { key: 'bonusesApproved', label: 'Bonos y comisiones aprobados', route: null },
  { key: 'runCalculated', label: 'Nómina calculada', route: '/payroll/runs' },
  { key: 'runPaid', label: 'Nómina pagada y contabilizada', route: '/payroll/runs' },
];

function progressColor(completed) {
  if (completed >= 5) return 'var(--success, #22c55e)';
  if (completed >= 3) return 'var(--warning, #f59e0b)';
  return 'var(--destructive, #ef4444)';
}

export default function PayrollChecklist({ completedKeys = [], period = '' }) {
  const navigate = useNavigate();
  const completedCount = STEPS.filter(s => completedKeys.includes(s.key)).length;
  const pct = Math.round((completedCount / STEPS.length) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Checklist de nómina {period && `— ${period}`}
        </p>
        <span className="text-xs font-medium" style={{ color: progressColor(completedCount) }}>
          {completedCount}/{STEPS.length}
        </span>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: progressColor(completedCount) }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {/* Steps */}
      <motion.ul
        className="space-y-1.5"
        variants={STAGGER(0.03)}
        initial="initial"
        animate="animate"
      >
        {STEPS.map((step) => {
          const done = completedKeys.includes(step.key);
          return (
            <motion.li
              key={step.key}
              variants={listItem}
              className={`flex items-center gap-2 text-sm rounded-lg px-2 py-1.5 transition-colors ${
                step.route ? 'cursor-pointer hover:bg-muted/60' : ''
              }`}
              onClick={() => step.route && navigate(step.route)}
            >
              <AnimatePresence mode="wait">
                {done ? (
                  <motion.span
                    key="done"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={SPRING.bouncy}
                  >
                    <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                  </motion.span>
                ) : (
                  <motion.span key="pending" initial={{ scale: 1 }} animate={{ scale: 1 }}>
                    <Circle size={16} className="text-muted-foreground shrink-0" />
                  </motion.span>
                )}
              </AnimatePresence>
              <span className={done ? 'line-through text-muted-foreground' : ''}>{step.label}</span>
              {!done && step.route && (
                <ArrowRight size={12} className="ml-auto text-muted-foreground" />
              )}
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}
