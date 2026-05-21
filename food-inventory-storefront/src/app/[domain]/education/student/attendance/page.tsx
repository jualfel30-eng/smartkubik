'use client';

import { useEffect, useState } from 'react';
import { educationApi } from '@/lib/educationApi';
import AttendanceSummary from '@/templates/EducationPortal/components/AttendanceSummary';

interface AttendanceDetail {
  date: string;
  status: 'present' | 'absent' | 'late';
  subjectName: string;
}

interface AttendanceData {
  attendancePct: number;
  present: number;
  absent: number;
  late: number;
  records: AttendanceDetail[];
}

const STATUS_LABELS: Record<string, string> = {
  present: 'Presente',
  absent: 'Ausente',
  late: 'Tarde',
};

const STATUS_COLORS: Record<string, string> = {
  present: 'var(--edu-success)',
  absent: 'var(--edu-danger)',
  late: 'var(--edu-warning)',
};

export default function StudentAttendancePage() {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    educationApi.get<AttendanceData>('/education/attendance/my')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: '720px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 3vw, 32px)', color: 'var(--edu-navy)', margin: '0 0 32px' }}>
        Mi Asistencia
      </h1>

      {loading ? (
        <div style={{ height: '120px', background: 'var(--edu-gray-100)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ) : data ? (
        <>
          <div style={{ marginBottom: '40px' }}>
            <AttendanceSummary
              attendancePct={data.attendancePct}
              present={data.present}
              absent={data.absent}
              late={data.late}
            />
          </div>

          <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--edu-gray-700)', margin: '0 0 4px' }}>
            Historial
          </h2>

          {data.records.map((r, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 0',
              borderBottom: '1px solid var(--edu-gray-100)',
            }}>
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--edu-gray-900)', margin: 0 }}>
                  {r.subjectName}
                </p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--edu-gray-500)', margin: '4px 0 0' }}>
                  {new Date(r.date).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <span style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: STATUS_COLORS[r.status] || 'var(--edu-gray-500)',
              }}>
                {STATUS_LABELS[r.status] || r.status}
              </span>
            </div>
          ))}
        </>
      ) : (
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--edu-gray-400)' }}>No hay registros de asistencia.</p>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
    </div>
  );
}
