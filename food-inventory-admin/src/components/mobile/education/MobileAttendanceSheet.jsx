import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEduAttendance } from '@/hooks/use-edu-attendance';
import { useEduClassroomRoster } from '@/hooks/use-edu-classrooms';
import { listItem, STAGGER } from '@/lib/motion';
import { useReducedMotionSafe } from '@/hooks/use-reduced-motion-safe';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';

const STATUS_OPTIONS = [
  { key: 'P', label: 'Presente', activeColor: '#10b981', bgColor: 'rgb(16 185 129 / 0.12)' },
  { key: 'A', label: 'Ausente',  activeColor: '#ef4444', bgColor: 'rgb(239 68 68 / 0.12)' },
  { key: 'T', label: 'Tarde',    activeColor: '#f59e0b', bgColor: 'rgb(245 158 11 / 0.12)' },
];

export default function MobileAttendanceSheet() {
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const { saveBatch } = useEduAttendance();
  const { roster, load } = useEduClassroomRoster(classroomId);
  const { v: rv } = useReducedMotionSafe();

  const today = format(new Date(), 'yyyy-MM-dd');
  const [attendance, setAttendance] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (roster.length > 0) {
      const init = {};
      roster.forEach(s => { init[s._id] = 'P'; });
      setAttendance(init);
    }
  }, [roster]);

  const setStatus = (studentId, status) => {
    haptics.tap();
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        studentId, status, date: today, classroomId,
      }));
      await saveBatch({ records, date: today, classroomId });
      toast.success('Lista guardada');
      setSaved(true);
      haptics.tap();
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* TopBar */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={() => { haptics.tap(); navigate(-1); }}
          className="p-2 rounded-xl no-tap-highlight"
          style={{ minWidth: 44, minHeight: 44 }}
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold truncate">Pasar Lista</p>
          <p className="text-[11px] text-muted-foreground/60 capitalize">
            {format(new Date(), "EEE d 'de' MMMM", { locale: es })}
          </p>
        </div>
        <span className="text-[12px] text-muted-foreground/60 shrink-0">
          {roster.length} alumnos
        </span>
      </div>

      {/* Roster list — scrollable */}
      <div className="flex-1 overflow-y-auto">
        {roster.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground/60">
            <p className="text-[14px]">No hay alumnos en este salón</p>
          </div>
        ) : (
          <motion.div
            className="divide-y divide-border/40"
            initial="initial" animate="animate"
            variants={rv(STAGGER(0.025))}
          >
            {roster.map((student, idx) => {
              const current = attendance[student._id] ?? 'P';
              return (
                <motion.div
                  key={student._id}
                  variants={listItem}
                  className="px-4 py-3.5 space-y-2.5"
                >
                  <p className="text-[14px] font-semibold">
                    {idx + 1}. {student.lastName}, {student.firstName}
                  </p>
                  <div className="flex items-center gap-2">
                    {STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setStatus(student._id, opt.key)}
                        className="flex-1 font-bold text-[13px] no-tap-highlight transition-all"
                        style={{
                          height: 56,
                          borderRadius: 'var(--mobile-radius-xl)',
                          background: current === opt.key ? opt.activeColor : opt.bgColor,
                          color: current === opt.key ? 'white' : opt.activeColor,
                          boxShadow: current === opt.key ? `0 4px 12px ${opt.activeColor}30` : 'none',
                          transform: current === opt.key ? 'scale(1.02)' : 'scale(1)',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* FAB sticky at bottom */}
      <div
        className="shrink-0 px-4 py-4 border-t border-border"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        <AnimatePresence>
          {saved ? (
            <motion.div
              key="saved"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-full text-[14px] font-bold text-white"
              style={{ background: '#10b981' }}
            >
              <CheckCircle2 size={18} strokeWidth={2} />
              Lista guardada
            </motion.div>
          ) : (
            <motion.button
              key="save"
              type="button"
              disabled={saving || roster.length === 0}
              onClick={handleSave}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-full text-[14px] font-bold text-primary-foreground disabled:opacity-50 no-tap-highlight"
              style={{ background: 'var(--gradient-primary)', boxShadow: '0 4px 20px oklch(0.62 0.22 268 / 0.3)' }}
            >
              {saving ? 'Guardando...' : 'Guardar Lista'}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
