export interface Grade {
  subjectName: string;
  teacherName: string;
  period: string;
  score: number | null;
  maxScore: number;
  passed: boolean;
}

interface GradeRowProps {
  grade: Grade;
}

export default function GradeRow({ grade }: GradeRowProps) {
  const pct = grade.score !== null ? (grade.score / grade.maxScore) * 100 : 0;
  const statusColor = grade.score === null
    ? 'var(--edu-gray-400)'
    : grade.passed ? 'var(--edu-success)' : 'var(--edu-danger)';
  const statusLabel = grade.score === null ? 'Pendiente' : grade.passed ? 'Aprobado' : 'Reprobado';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      alignItems: 'center',
      padding: '20px 0',
      borderBottom: '1px solid var(--edu-gray-100)',
      gap: '24px',
    }}>
      <div>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          fontSize: 'var(--text-base)',
          color: 'var(--edu-gray-900)',
          margin: 0,
        }}>
          {grade.subjectName}
        </p>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          color: 'var(--edu-gray-500)',
          margin: '4px 0 0',
        }}>
          Prof. {grade.teacherName} · {grade.period}
        </p>
        <div style={{
          height: '3px',
          background: 'var(--edu-gray-100)',
          borderRadius: '2px',
          marginTop: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: grade.score === null ? 'var(--edu-gray-300)' : grade.passed ? 'var(--edu-success)' : 'var(--edu-danger)',
            borderRadius: '2px',
            transition: 'width 600ms ease',
          }} />
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '28px',
          fontWeight: 700,
          color: statusColor,
        }}>
          {grade.score ?? '—'}
        </span>
        <span style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          color: 'var(--edu-gray-500)',
        }}>
          /{grade.maxScore}
        </span>
        <span style={{
          display: 'block',
          fontFamily: 'var(--font-body)',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: statusColor,
          marginTop: '4px',
        }}>
          {statusLabel}
        </span>
      </div>
    </div>
  );
}
