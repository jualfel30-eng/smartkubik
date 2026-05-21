import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckSquare, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEduAttendance } from '@/hooks/use-edu-attendance';
import { useEduClassrooms } from '@/hooks/use-edu-classrooms';
import { useEduClassroomRoster } from '@/hooks/use-edu-classrooms';
import { listItem, STAGGER } from '@/lib/motion';
import { useReducedMotionSafe } from '@/hooks/use-reduced-motion-safe';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';

const STATUS_OPTIONS = [
  { key: 'P', label: 'Presente', color: 'rgb(16 185 129 / 0.15)', active: '#10b981' },
  { key: 'A', label: 'Ausente',  color: 'rgb(239 68 68 / 0.15)',  active: '#ef4444' },
  { key: 'T', label: 'Tarde',    color: 'rgb(245 158 11 / 0.15)', active: '#f59e0b' },
  { key: 'J', label: 'Justif.', color: 'rgb(59 130 246 / 0.15)',  active: '#3b82f6' },
];

export default function AttendanceSheet() {
  const { saveBatch } = useEduAttendance();
  const { classrooms, load: loadClassrooms } = useEduClassrooms();
  const [classroomId, setClassroomId] = useState('');
  const { roster, load: loadRoster } = useEduClassroomRoster(classroomId);
  const { v: rv } = useReducedMotionSafe();

  const today = format(new Date(), 'yyyy-MM-dd');
  const [attendance, setAttendance] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadClassrooms(); }, [loadClassrooms]);
  useEffect(() => { if (classroomId) loadRoster(); }, [loadRoster, classroomId]);

  useEffect(() => {
    if (roster.length > 0) {
      const init = {};
      roster.forEach(s => { init[s._id] = 'P'; });
      setAttendance(init);
      setSaved(false);
    }
  }, [roster]);

  const setStatus = (studentId, status) => {
    haptics.tap();
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    if (!classroomId) { toast.error('Selecciona un salón'); return; }
    setSaving(true);
    try {
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        studentId, status, date: today, classroomId,
      }));
      await saveBatch({ records, date: today, classroomId });
      toast.success('Asistencia guardada');
      setSaved(true);
      haptics.tap();
    } catch {
      toast.error('Error al guardar asistencia');
    } finally {
      setSaving(false);
    }
  };

  const selectedClassroom = classrooms.find(c => c._id === classroomId);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--glass-subtle)' }}>
            <CheckSquare size={20} strokeWidth={1.5} className="text-primary" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold">Pasar Lista</h1>
            <p className="text-[12px] text-muted-foreground/60 capitalize">
              {format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
        </div>
        <select
          value={classroomId}
          onChange={e => setClassroomId(e.target.value)}
          className="text-[13px] px-3 py-2 rounded-lg border border-border bg-card"
        >
          <option value="">Selecciona un salón</option>
          {classrooms.map(c => (
            <option key={c._id} value={c._id}>{c.grade} {c.section}</option>
          ))}
        </select>
      </div>

      {selectedClassroom && (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground/60">
          <span className="font-medium text-foreground">{selectedClassroom.grade} {selectedClassroom.section}</span>
          {selectedClassroom.tutorName && <span>· Prof. {selectedClassroom.tutorName}</span>}
          <span>· {roster.length} alumnos</span>
        </div>
      )}

      {!classroomId ? (
        <div className="text-center py-16 text-muted-foreground/60">
          <CheckSquare size={40} strokeWidth={1} className="mx-auto mb-3 opacity-30" />
          <p className="text-[14px]">Selecciona un salón para pasar lista</p>
        </div>
      ) : roster.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground/60 text-[13px]">
          No hay alumnos en este salón
        </div>
      ) : (
        <>
          <motion.div
            className="bg-card overflow-hidden"
            style={{ borderRadius: 'var(--mobile-radius-xl)', boxShadow: 'var(--elevation-rest)' }}
            initial="initial" animate="animate" variants={rv(STAGGER(0.025))}
          >
            {roster.map((student, idx) => {
              const current = attendance[student._id] ?? 'P';
              return (
                <motion.div
                  key={student._id}
                  variants={listItem}
                  className="flex items-center gap-4 px-4 py-3 border-b border-border/40 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">
                      {idx + 1}. {student.lastName}, {student.firstName}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setStatus(student._id, opt.key)}
                        className="w-10 h-9 rounded-lg text-[11px] font-bold transition-all no-tap-highlight"
                        style={{
                          background: current === opt.key ? opt.active : opt.color,
                          color: current === opt.key ? 'white' : opt.active,
                          boxShadow: current === opt.key ? `0 2px 8px ${opt.active}40` : 'none',
                        }}
                        title={opt.label}
                      >
                        {opt.key}
                      </button>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Summary */}
          <div className="flex items-center gap-4 text-[12px] flex-wrap">
            {STATUS_OPTIONS.map(opt => {
              const count = Object.values(attendance).filter(s => s === opt.key).length;
              return (
                <span key={opt.key} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: opt.active }} />
                  <span className="text-muted-foreground/60">{opt.label}:</span>
                  <span className="font-semibold">{count}</span>
                </span>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={saving || saved}
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
              style={{ borderRadius: 'var(--mobile-radius-full)', background: saved ? '#10b981' : 'var(--gradient-primary)' }}
            >
              {saved ? <CheckSquare size={14} strokeWidth={2} /> : <Save size={14} strokeWidth={2} />}
              {saving ? 'Guardando...' : saved ? 'Guardada' : 'Guardar Asistencia'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
