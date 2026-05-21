import { useEffect, useState } from 'react';
import { CalendarDays, School, Users } from 'lucide-react';
import { useEduSchedules } from '@/hooks/use-edu-schedules';
import haptics from '@/lib/haptics';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const HOURS = Array.from({ length: 10 }, (_, i) => `${(7 + i).toString().padStart(2, '0')}:00`);

const SUBJECT_COLORS = [
  '#c084fc', '#4ade80', '#38bdf8', '#fb923c', '#f472b6',
  '#a78bfa', '#34d399', '#60a5fa', '#fbbf24', '#f87171',
];

function getColor(subjectName, colorMap) {
  if (!colorMap[subjectName]) {
    const idx = Object.keys(colorMap).length % SUBJECT_COLORS.length;
    colorMap[subjectName] = SUBJECT_COLORS[idx];
  }
  return colorMap[subjectName];
}

function BlockSheet({ block, onClose }) {
  if (!block) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgb(0 0 0 / 0.4)' }}
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-sm p-6 space-y-3"
        style={{ borderRadius: 'var(--mobile-radius-xl)', boxShadow: 'var(--elevation-raised)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-[16px] font-bold">{block.subjectName}</h3>
        <div className="space-y-2 text-[13px] text-muted-foreground">
          <p><span className="font-medium text-foreground">Salón:</span> {block.classroomLabel}</p>
          <p><span className="font-medium text-foreground">Docente:</span> {block.teacherName || '—'}</p>
          <p><span className="font-medium text-foreground">Horario:</span> {block.startTime} – {block.endTime}</p>
          <p><span className="font-medium text-foreground">Día:</span> {block.dayLabel}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full mt-4 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

export default function ScheduleGrid() {
  const { schedules, loading, load } = useEduSchedules();
  const [viewMode, setViewMode] = useState('classroom');
  const [selectedBlock, setSelectedBlock] = useState(null);
  const colorMap = {};

  useEffect(() => { load(); }, [load]);

  // Build grid: { dayKey → { hour → [block] } }
  const grid = {};
  DAY_KEYS.forEach(d => { grid[d] = {}; });

  schedules.forEach(sched => {
    sched.blocks?.forEach(block => {
      const key = block.dayOfWeek;
      if (!grid[key]) return;
      const hour = block.startTime?.slice(0, 5);
      if (!grid[key][hour]) grid[key][hour] = [];
      grid[key][hour].push({
        ...block,
        subjectName: block.subjectName || sched.subjectName || 'Materia',
        classroomLabel: sched.classroomLabel || sched.grade,
        teacherName: block.teacherName || sched.teacherName,
        dayLabel: DAYS[DAY_KEYS.indexOf(key)],
      });
    });
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--glass-subtle)' }}>
            <CalendarDays size={20} strokeWidth={1.5} className="text-primary" />
          </div>
          <h1 className="text-[20px] font-bold">Horarios semanales</h1>
        </div>
        <div className="flex items-center gap-2 p-1 rounded-xl" style={{ background: 'var(--glass-subtle)' }}>
          {[
            { key: 'classroom', label: 'Por salón', icon: School },
            { key: 'teacher',   label: 'Por docente', icon: Users },
          ].map(m => (
            <button
              key={m.key}
              type="button"
              onClick={() => { haptics.tap(); setViewMode(m.key); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-all"
              style={{
                borderRadius: 'var(--mobile-radius-lg)',
                background: viewMode === m.key ? 'var(--gradient-primary)' : 'transparent',
                color: viewMode === m.key ? 'white' : 'var(--muted-foreground)',
              }}
            >
              <m.icon size={13} strokeWidth={1.5} />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-96 bg-muted animate-pulse rounded-[var(--mobile-radius-xl)]" />
      ) : (
        <div className="overflow-x-auto rounded-[var(--mobile-radius-xl)]" style={{ boxShadow: 'var(--elevation-rest)' }}>
          <table className="w-full min-w-[640px] bg-card text-[12px]">
            <thead>
              <tr>
                <th className="p-3 text-left text-muted-foreground/60 font-medium border-b border-border w-16">Hora</th>
                {DAYS.map(d => (
                  <th key={d} className="p-3 text-center text-muted-foreground/60 font-medium border-b border-border">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map(hour => (
                <tr key={hour} className="border-b border-border/40 last:border-0">
                  <td className="p-2 text-muted-foreground/50 font-mono text-[11px] align-top pt-3">{hour}</td>
                  {DAY_KEYS.map(dayKey => {
                    const blocks = grid[dayKey][hour] ?? [];
                    return (
                      <td key={dayKey} className="p-1 align-top">
                        {blocks.map((block, idx) => {
                          const color = getColor(block.subjectName, colorMap);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => { haptics.tap(); setSelectedBlock(block); }}
                              className="w-full text-left p-2 mb-1 rounded-lg text-[11px] font-medium no-tap-highlight"
                              style={{
                                background: `${color}18`,
                                borderLeft: `3px solid ${color}`,
                                color,
                              }}
                            >
                              <div className="font-semibold truncate">{block.subjectName}</div>
                              <div className="text-[10px] opacity-70 truncate">{block.classroomLabel}</div>
                            </button>
                          );
                        })}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {schedules.length === 0 && !loading && (
        <div className="text-center py-16 text-muted-foreground/60">
          <CalendarDays size={40} strokeWidth={1} className="mx-auto mb-3 opacity-30" />
          <p className="text-[14px]">No hay horarios configurados</p>
        </div>
      )}

      <BlockSheet block={selectedBlock} onClose={() => setSelectedBlock(null)} />
    </div>
  );
}
