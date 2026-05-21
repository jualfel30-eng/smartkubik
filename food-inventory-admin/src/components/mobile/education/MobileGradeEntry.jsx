import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEduGrades } from '@/hooks/use-edu-grades';
import { useEduClassroomRoster } from '@/hooks/use-edu-classrooms';
import { listItem, STAGGER } from '@/lib/motion';
import { useReducedMotionSafe } from '@/hooks/use-reduced-motion-safe';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';

const PASSING = 10;
const MAX_SCORE = 20;

function PublishModal({ period, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ background: 'rgb(0 0 0 / 0.5)' }}>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
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
          Esta acción es irreversible. ¿Publicar las calificaciones de este lapso?
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 py-3 text-[13px] font-medium border border-border rounded-full">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm}
            className="flex-1 py-3 text-[13px] font-semibold text-primary-foreground rounded-full"
            style={{ background: 'var(--gradient-primary)' }}>
            Publicar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function MobileGradeEntry() {
  const { classroomId, period = 'L1' } = useParams();
  const navigate = useNavigate();
  const { grades, loading, load, save, update, publish } = useEduGrades();
  const { roster } = useEduClassroomRoster(classroomId);
  const { v: rv } = useReducedMotionSafe();

  const [localScores, setLocalScores] = useState({});
  const [publishModal, setPublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (classroomId) load({ classroomId, period });
  }, [load, classroomId, period]);

  useEffect(() => {
    const init = {};
    grades.forEach(g => { init[g.studentId] = g.score; });
    roster.forEach(s => { if (init[s._id] === undefined) init[s._id] = ''; });
    setLocalScores(init);
  }, [grades, roster]);

  const isPublished = grades.some(g => g.period === period && g.status === 'published');

  const handleBlur = async (studentId, value) => {
    const num = value === '' ? null : Number(value);
    const existing = grades.find(g => g.studentId === studentId && g.period === period);
    try {
      if (existing) {
        await update(existing._id, { score: num });
      } else {
        await save({ studentId, classroomId, period, score: num });
      }
    } catch {
      toast.error('Error al guardar nota');
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await publish({ classroomId, period });
      toast.success(`${period} publicado`);
      haptics.tap();
      load({ classroomId, period });
    } catch {
      toast.error('Error al publicar');
    } finally {
      setPublishing(false);
      setPublishModal(false);
    }
  };

  const subjectName = grades[0]?.subjectName || 'Calificaciones';

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* TopBar */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
      >
        <button type="button" onClick={() => { haptics.tap(); navigate(-1); }}
          className="p-2 rounded-xl no-tap-highlight" style={{ minWidth: 44, minHeight: 44 }}>
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold truncate">{subjectName}</p>
          <p className="text-[11px] text-muted-foreground/60">Lapso {period}</p>
        </div>
        {isPublished && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold text-emerald-600"
            style={{ background: 'rgb(16 185 129 / 0.1)' }}>
            <Lock size={10} strokeWidth={1.5} />
            Publicado
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-[var(--mobile-radius-xl)]" />
            ))}
          </div>
        ) : (
          <motion.div
            className="divide-y divide-border/40"
            initial="initial" animate="animate"
            variants={rv(STAGGER(0.025))}
          >
            {roster.map((student, idx) => {
              const score = localScores[student._id];
              const numScore = score !== '' && score != null ? Number(score) : null;
              const passed = numScore != null && numScore >= PASSING;
              const failed = numScore != null && numScore < PASSING;

              return (
                <motion.div
                  key={student._id}
                  variants={listItem}
                  className="flex items-center gap-4 px-4 py-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold">{student.lastName}, {student.firstName}</p>
                    {numScore != null && (
                      <div className="flex items-center gap-1.5 mt-1">
                        {passed
                          ? <CheckCircle2 size={12} strokeWidth={1.5} className="text-emerald-500" />
                          : <XCircle size={12} strokeWidth={1.5} className="text-destructive" />
                        }
                        <span className={`text-[11px] font-semibold ${passed ? 'text-emerald-500' : 'text-destructive'}`}>
                          {passed ? 'Aprobado' : 'Reprobado'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isPublished ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[18px] font-extrabold tabular-nums">{score ?? '—'}</span>
                        <span className="text-[12px] text-muted-foreground/50">/{MAX_SCORE}</span>
                        <Lock size={11} strokeWidth={1.5} className="text-muted-foreground/30 ml-1" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={MAX_SCORE}
                          value={score ?? ''}
                          onChange={e => setLocalScores(prev => ({ ...prev, [student._id]: e.target.value }))}
                          onBlur={e => handleBlur(student._id, e.target.value)}
                          className="w-16 h-12 text-center text-[18px] font-extrabold tabular-nums border-2 border-border bg-transparent rounded-xl focus:outline-none focus:border-primary transition-colors"
                          placeholder="—"
                          style={{ minHeight: 48 }}
                        />
                        <span className="text-[12px] text-muted-foreground/50">/{MAX_SCORE}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Bottom actions */}
      {!isPublished && (
        <div
          className="shrink-0 px-4 py-4 flex gap-3 border-t border-border"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={() => toast.success('Borrador guardado automáticamente')}
            className="flex-1 py-3.5 text-[13px] font-semibold border border-border"
            style={{ borderRadius: 'var(--mobile-radius-full)' }}
          >
            Guardar Borrador
          </button>
          <button
            type="button"
            disabled={publishing || roster.length === 0}
            onClick={() => setPublishModal(true)}
            className="flex-1 py-3.5 text-[13px] font-bold text-primary-foreground disabled:opacity-50 no-tap-highlight"
            style={{
              borderRadius: 'var(--mobile-radius-full)',
              background: 'var(--gradient-primary)',
              boxShadow: '0 4px 20px oklch(0.62 0.22 268 / 0.3)',
            }}
          >
            {publishing ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      )}

      <AnimatePresence>
        {publishModal && (
          <PublishModal
            period={period}
            onConfirm={handlePublish}
            onCancel={() => setPublishModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
