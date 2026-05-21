import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { School, Users, PlusCircle, ChevronRight, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEduClassrooms } from '@/hooks/use-edu-classrooms';
import { listItem, STAGGER } from '@/lib/motion';
import { useReducedMotionSafe } from '@/hooks/use-reduced-motion-safe';
import haptics from '@/lib/haptics';

const CURRENT_YEAR = new Date().getFullYear();
const ACADEMIC_YEARS = [`${CURRENT_YEAR - 1}-${CURRENT_YEAR}`, `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`];
const GRADES = ['1er', '2do', '3er', '4to', '5to', '6to', '7mo', '8vo', '9no'];

function SolvencyBadge({ solventes, morosos }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full"
        style={{ background: 'rgb(16 185 129 / 0.12)', color: 'var(--color-emerald-500, #10b981)' }}>
        {solventes} solv.
      </span>
      {morosos > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full"
          style={{ background: 'rgb(239 68 68 / 0.12)', color: 'var(--color-destructive, #ef4444)' }}>
          {morosos} mor.
        </span>
      )}
    </div>
  );
}

export default function ClassroomManagement() {
  const navigate = useNavigate();
  const { classrooms, loading, load } = useEduClassrooms();
  const { v: rv } = useReducedMotionSafe();
  const [yearFilter, setYearFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');

  useEffect(() => {
    load(yearFilter || gradeFilter ? { ...(yearFilter && { academicYear: yearFilter }), ...(gradeFilter && { grade: gradeFilter }) } : {});
  }, [load, yearFilter, gradeFilter]);

  const filtered = classrooms.filter(c => {
    if (yearFilter && c.academicYear !== yearFilter) return false;
    if (gradeFilter && !c.grade?.startsWith(gradeFilter)) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--glass-subtle)' }}>
            <School size={20} strokeWidth={1.5} className="text-primary" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold">Salones</h1>
            <p className="text-[12px] text-muted-foreground/60">{filtered.length} salones</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { haptics.tap(); navigate('/education/classrooms/new'); }}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-primary-foreground no-tap-highlight"
          style={{ borderRadius: 'var(--mobile-radius-full)', background: 'var(--gradient-primary)' }}
        >
          <PlusCircle size={14} strokeWidth={2} />
          Nuevo salón
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={yearFilter}
          onChange={e => setYearFilter(e.target.value)}
          className="text-[13px] px-3 py-2 rounded-lg border border-border bg-card"
        >
          <option value="">Todos los años</option>
          {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={gradeFilter}
          onChange={e => setGradeFilter(e.target.value)}
          className="text-[13px] px-3 py-2 rounded-lg border border-border bg-card"
        >
          <option value="">Todos los grados</option>
          {GRADES.map(g => <option key={g} value={g}>{g} grado</option>)}
        </select>
      </div>

      {/* Table / Card list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-[var(--mobile-radius-xl)]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground/60">
          <School size={40} strokeWidth={1} className="mx-auto mb-3 opacity-30" />
          <p className="text-[14px]">No hay salones aún</p>
        </div>
      ) : (
        <motion.div className="space-y-2" initial="initial" animate="animate" variants={rv(STAGGER(0.04))}>
          {filtered.map(classroom => (
            <motion.div
              key={classroom._id}
              variants={listItem}
              className="bg-card p-4 flex items-center gap-4"
              style={{ borderRadius: 'var(--mobile-radius-xl)', boxShadow: 'var(--elevation-rest)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--glass-subtle)' }}>
                <School size={18} strokeWidth={1.5} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold">
                  {classroom.grade} {classroom.section}
                  <span className="ml-2 text-[11px] text-muted-foreground/50 font-normal">{classroom.academicYear}</span>
                </p>
                <p className="text-[12px] text-muted-foreground/60 truncate mt-0.5">
                  {classroom.tutorName ? `Prof. ${classroom.tutorName}` : 'Sin tutor asignado'}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 text-[12px] text-muted-foreground/60">
                  <Users size={12} strokeWidth={1.5} />
                  <span>{classroom.activeStudents ?? 0}/{classroom.totalStudents ?? 0}</span>
                </div>
                <SolvencyBadge
                  solventes={classroom.solventCount ?? 0}
                  morosos={classroom.delinquentCount ?? 0}
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => { haptics.tap(); navigate(`/education/classrooms/${classroom._id}/roster`); }}
                  className="p-2 rounded-lg no-tap-highlight hover:bg-muted transition-colors"
                  title="Ver alumnos"
                >
                  <Users size={15} strokeWidth={1.5} className="text-primary" />
                </button>
                <button
                  type="button"
                  onClick={() => { haptics.tap(); navigate(`/education/grades?classroomId=${classroom._id}`); }}
                  className="p-2 rounded-lg no-tap-highlight hover:bg-muted transition-colors"
                  title="Calificaciones"
                >
                  <BookOpen size={15} strokeWidth={1.5} className="text-blue-500" />
                </button>
                <button
                  type="button"
                  onClick={() => { haptics.tap(); navigate(`/education/classrooms/${classroom._id}/edit`); }}
                  className="p-2 rounded-lg no-tap-highlight hover:bg-muted transition-colors"
                  title="Editar"
                >
                  <ChevronRight size={15} strokeWidth={1.5} className="text-muted-foreground/40" />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
