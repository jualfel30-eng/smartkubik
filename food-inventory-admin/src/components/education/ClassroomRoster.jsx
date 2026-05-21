import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Receipt, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEduClassroomRoster } from '@/hooks/use-edu-classrooms';
import { listItem, STAGGER } from '@/lib/motion';
import { useReducedMotionSafe } from '@/hooks/use-reduced-motion-safe';
import haptics from '@/lib/haptics';

function Avatar({ name }) {
  const initials = name
    ? name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-primary-foreground shrink-0"
      style={{ background: 'var(--gradient-primary)' }}
    >
      {initials}
    </div>
  );
}

function SolvencyBadge({ status }) {
  const isSolvent = status === 'solvent' || status === 'paid';
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full"
      style={{
        background: isSolvent ? 'rgb(16 185 129 / 0.12)' : 'rgb(239 68 68 / 0.12)',
        color: isSolvent ? '#10b981' : '#ef4444',
      }}
    >
      {isSolvent ? 'Solvente' : 'Moroso'}
    </span>
  );
}

export default function ClassroomRoster() {
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const { roster, loading, load } = useEduClassroomRoster(classroomId);
  const { v: rv } = useReducedMotionSafe();

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => { haptics.tap(); navigate('/education/classrooms'); }}
          className="p-2 rounded-lg no-tap-highlight hover:bg-muted transition-colors"
        >
          <ArrowLeft size={18} strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="text-[20px] font-bold">Lista de alumnos</h1>
          <p className="text-[12px] text-muted-foreground/60">{roster.length} alumnos</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-[var(--mobile-radius-xl)]" />
          ))}
        </div>
      ) : roster.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground/60">
          <p className="text-[14px]">No hay alumnos en este salón</p>
        </div>
      ) : (
        <motion.div className="space-y-2" initial="initial" animate="animate" variants={rv(STAGGER(0.035))}>
          {roster.map(student => (
            <motion.div
              key={student._id}
              variants={listItem}
              className="bg-card p-4 flex items-center gap-3"
              style={{ borderRadius: 'var(--mobile-radius-xl)', boxShadow: 'var(--elevation-rest)' }}
            >
              <Avatar name={`${student.firstName} ${student.lastName}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[14px] font-semibold truncate">
                    {student.lastName}, {student.firstName}
                  </p>
                  <SolvencyBadge status={student.tuitionStatus} />
                </div>
                <p className="text-[12px] text-muted-foreground/60 mt-0.5">
                  Matr. {student.enrollmentNumber}
                  {student.attendancePct != null && ` · ${student.attendancePct}% asistencia`}
                  {student.gradeAverage != null && ` · Prom. ${student.gradeAverage}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => { haptics.tap(); navigate(`/education/tuition?studentId=${student._id}`); }}
                  className="p-2 rounded-lg no-tap-highlight hover:bg-muted transition-colors"
                  title="Ver cuotas"
                >
                  <Receipt size={15} strokeWidth={1.5} className="text-amber-500" />
                </button>
                <button
                  type="button"
                  onClick={() => { haptics.tap(); navigate(`/education/students/${student._id}`); }}
                  className="p-2 rounded-lg no-tap-highlight hover:bg-muted transition-colors"
                  title="Ver expediente"
                >
                  <FileText size={15} strokeWidth={1.5} className="text-primary" />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
