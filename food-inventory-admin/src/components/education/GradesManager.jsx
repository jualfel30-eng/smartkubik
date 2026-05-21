import { useEffect, useState, useCallback } from 'react';
import { BookOpen, Lock, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEduGrades } from '@/hooks/use-edu-grades';
import { useEduClassrooms } from '@/hooks/use-edu-classrooms';
import { listItem, STAGGER } from '@/lib/motion';
import { useReducedMotionSafe } from '@/hooks/use-reduced-motion-safe';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';

const PASSING = 10;
const MAX_SCORE = 20;
const PERIODS = ['L1', 'L2', 'L3'];

function GradeInput({ value, published, onChange }) {
  const [localVal, setLocalVal] = useState(value ?? '');
  const num = Number(localVal);
  const isValid = localVal !== '' && num >= 0 && num <= MAX_SCORE;
  const passed = isValid && num >= PASSING;

  if (published) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="font-semibold tabular-nums">{value ?? '—'}</span>
        {value != null && (
          <span className={`text-[10px] font-semibold ${passed ? 'text-emerald-500' : 'text-destructive'}`}>
            {passed ? '✓' : '✗'}
          </span>
        )}
        <Lock size={11} strokeWidth={1.5} className="text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        max={MAX_SCORE}
        value={localVal}
        onChange={e => setLocalVal(e.target.value)}
        onBlur={() => {
          const n = localVal === '' ? null : Number(localVal);
          onChange(n);
        }}
        className="w-14 text-center text-[13px] font-semibold tabular-nums border border-border bg-transparent rounded-lg py-1 px-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
        placeholder="—"
      />
      {isValid && (
        passed
          ? <CheckCircle2 size={12} strokeWidth={1.5} className="text-emerald-500 shrink-0" />
          : <XCircle size={12} strokeWidth={1.5} className="text-destructive shrink-0" />
      )}
    </div>
  );
}

function PublishModal({ period, onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgb(0 0 0 / 0.5)' }}
    >
      <div
        className="bg-card w-full max-w-sm p-6 space-y-4"
        style={{ borderRadius: 'var(--mobile-radius-xl)', boxShadow: 'var(--elevation-raised)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgb(239 68 68 / 0.1)' }}>
            <Lock size={18} strokeWidth={1.5} className="text-destructive" />
          </div>
          <h3 className="text-[16px] font-bold">Publicar {period}</h3>
        </div>
        <p className="text-[13px] text-muted-foreground/80">
          Esta acción es irreversible. Las calificaciones quedarán bloqueadas y visibles para alumnos y tutores.
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 text-[13px] font-medium border border-border rounded-xl">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm}
            className="flex-1 py-2.5 text-[13px] font-semibold text-primary-foreground rounded-xl"
            style={{ background: 'var(--gradient-primary)' }}>
            Publicar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GradesManager() {
  const { grades, loading, load, update, publish } = useEduGrades();
  const { classrooms, load: loadClassrooms } = useEduClassrooms();
  const { v: rv } = useReducedMotionSafe();

  const [classroomId, setClassroomId] = useState('');
  const [period, setPeriod] = useState('L1');
  const [publishTarget, setPublishTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadClassrooms(); }, [loadClassrooms]);

  useEffect(() => {
    if (classroomId) load({ classroomId, period });
  }, [load, classroomId, period]);

  const handleGradeChange = useCallback(async (gradeId, value) => {
    try {
      await update(gradeId, { score: value, period });
    } catch {
      toast.error('Error al guardar nota');
    }
  }, [update, period]);

  const handlePublish = async () => {
    setSaving(true);
    try {
      await publish({ classroomId, period });
      toast.success(`${period} publicado exitosamente`);
      load({ classroomId, period });
    } catch {
      toast.error('Error al publicar');
    } finally {
      setSaving(false);
      setPublishTarget(null);
    }
  };

  const isPublished = grades.some(g => g.period === period && g.status === 'published');
  const students = Array.from(new Map(grades.map(g => [g.studentId, g])).values());

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--glass-subtle)' }}>
          <BookOpen size={20} strokeWidth={1.5} className="text-primary" />
        </div>
        <h1 className="text-[20px] font-bold">Calificaciones</h1>
      </div>

      {/* Selectors — sticky */}
      <div
        className="sticky top-0 z-10 -mx-6 px-6 py-3 flex items-center gap-3 flex-wrap backdrop-blur-sm"
        style={{ background: 'var(--background)/80' }}
      >
        <select
          value={classroomId}
          onChange={e => setClassroomId(e.target.value)}
          className="text-[13px] px-3 py-2 rounded-lg border border-border bg-card flex-1 min-w-[140px]"
        >
          <option value="">Selecciona un salón</option>
          {classrooms.map(c => (
            <option key={c._id} value={c._id}>{c.grade} {c.section}</option>
          ))}
        </select>
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--glass-subtle)' }}>
          {PERIODS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => { haptics.tap(); setPeriod(p); }}
              className="px-3 py-1.5 text-[12px] font-semibold transition-all"
              style={{
                borderRadius: 'var(--mobile-radius-lg)',
                background: period === p ? 'var(--gradient-primary)' : 'transparent',
                color: period === p ? 'white' : 'var(--muted-foreground)',
              }}
            >
              {p}
            </button>
          ))}
        </div>
        {isPublished && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-emerald-600"
            style={{ borderRadius: 'var(--mobile-radius-lg)', background: 'rgb(16 185 129 / 0.1)' }}>
            <Lock size={11} strokeWidth={1.5} />
            Publicado
          </div>
        )}
      </div>

      {!classroomId ? (
        <div className="text-center py-16 text-muted-foreground/60">
          <BookOpen size={40} strokeWidth={1} className="mx-auto mb-3 opacity-30" />
          <p className="text-[14px]">Selecciona un salón para ver calificaciones</p>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded-[var(--mobile-radius-xl)]" />
          ))}
        </div>
      ) : (
        <>
          <motion.div
            className="bg-card overflow-hidden"
            style={{ borderRadius: 'var(--mobile-radius-xl)', boxShadow: 'var(--elevation-rest)' }}
            initial="initial" animate="animate" variants={rv(STAGGER(0.03))}
          >
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 border-b border-border text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wide">
              <span>Alumno</span>
              <span className="text-center w-24">Nota ({period}/{MAX_SCORE})</span>
              <span className="text-center w-20">Estado</span>
            </div>
            {students.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground/60 text-[13px]">
                No hay datos para este período
              </div>
            ) : (
              students.map(g => (
                <motion.div
                  key={g.studentId}
                  variants={listItem}
                  className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-4 py-3 border-b border-border/40 last:border-0"
                >
                  <span className="text-[13px] font-medium">
                    {g.studentLastName}, {g.studentFirstName}
                  </span>
                  <div className="w-24 flex justify-center">
                    <GradeInput
                      value={g.score}
                      published={isPublished}
                      onChange={val => handleGradeChange(g._id, val)}
                    />
                  </div>
                  <div className="w-20 flex justify-center">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      g.score == null ? 'text-muted-foreground/40 bg-muted' :
                      g.score >= PASSING ? 'text-emerald-600 bg-emerald-500/10' : 'text-destructive bg-destructive/10'
                    }`}>
                      {g.score == null ? 'Sin nota' : g.score >= PASSING ? 'Aprobado' : 'Reprobado'}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>

          {!isPublished && students.length > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() => setPublishTarget(period)}
                className="flex items-center gap-2 px-6 py-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
                style={{ borderRadius: 'var(--mobile-radius-full)', background: 'var(--gradient-primary)' }}
              >
                <Lock size={14} strokeWidth={2} />
                Publicar {period}
              </button>
            </div>
          )}
        </>
      )}

      {publishTarget && (
        <PublishModal
          period={publishTarget}
          onConfirm={handlePublish}
          onCancel={() => setPublishTarget(null)}
        />
      )}
    </div>
  );
}
