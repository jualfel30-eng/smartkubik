interface AttendanceSummaryProps {
  attendancePct: number;
  present: number;
  absent: number;
  late: number;
}

export default function AttendanceSummary({ attendancePct, present, absent, late }: AttendanceSummaryProps) {
  const isOk = attendancePct >= 80;
  const color = isOk ? 'var(--edu-success)' : 'var(--edu-danger)';

  return (
    <div style={{
      border: '1px solid var(--edu-gray-200)',
      borderRadius: 'var(--radius-md)',
      padding: '24px',
      background: 'var(--edu-white)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: '16px',
      }}>
        <h3 style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          fontSize: 'var(--text-base)',
          color: 'var(--edu-gray-700)',
          margin: 0,
        }}>
          Asistencia del Período
        </h3>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '32px',
          color,
        }}>
          {attendancePct}%
        </span>
      </div>

      <div style={{
        height: '6px',
        background: 'var(--edu-gray-100)',
        borderRadius: '3px',
        overflow: 'hidden',
        marginBottom: '16px',
      }}>
        <div style={{
          height: '100%',
          width: `${attendancePct}%`,
          background: color,
          borderRadius: '3px',
          transition: 'width 700ms ease',
        }} />
      </div>

      <div style={{
        display: 'flex',
        gap: '24px',
        fontSize: 'var(--text-sm)',
        color: 'var(--edu-gray-600)',
        fontFamily: 'var(--font-body)',
        flexWrap: 'wrap',
      }}>
        <span>✓ {present} presentes</span>
        <span>✗ {absent} ausentes</span>
        <span>⏱ {late} tarde</span>
      </div>
    </div>
  );
}
