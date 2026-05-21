'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { educationApi } from '@/lib/educationApi';
import { useEducationAuth } from '@/contexts/EducationAuthContext';

interface TeacherSummary {
  todayClasses: { classroomName: string; subjectName: string; startTime: string; endTime: string }[];
  pendingAttendance: number;
  pendingGrades: number;
  totalStudents: number;
}

export default function TeacherDashboard() {
  const { user } = useEducationAuth();
  const params = useParams<{ domain: string }>();
  const domain = params.domain;
  const [data, setData] = useState<TeacherSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    educationApi.get<TeacherSummary>('/education/dashboard/teacher-summary')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 3vw, 36px)', color: 'var(--edu-navy)', margin: '0 0 8px' }}>
        Hola, Prof. {user?.name?.split(' ')[0] || 'Docente'}
      </h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--edu-gray-500)', margin: '0 0 40px' }}>
        Panel docente
      </p>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '40px' }} className="edu-teacher-stats">
        <StatCard label="Alumnos totales" value={data?.totalStudents ?? '—'} loading={loading} />
        <StatCard label="Asistencias pendientes" value={data?.pendingAttendance ?? '—'} loading={loading} urgent />
        <StatCard label="Calificaciones pendientes" value={data?.pendingGrades ?? '—'} loading={loading} />
      </div>

      {/* Clases de hoy */}
      <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--edu-gray-700)', margin: '0 0 16px' }}>
        Clases de hoy
      </h2>

      {loading ? (
        <div style={{ height: '80px', background: 'var(--edu-gray-100)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ) : data?.todayClasses?.length ? (
        data.todayClasses.map((c, i) => (
          <div key={i} style={{
            border: '1px solid var(--edu-gray-200)',
            borderRadius: 'var(--radius-md)',
            padding: '20px 24px',
            marginBottom: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--edu-gray-900)', margin: 0 }}>
                {c.subjectName} — {c.classroomName}
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--edu-gray-500)', margin: '4px 0 0' }}>
                {c.startTime} – {c.endTime}
              </p>
            </div>
            <Link href={`/${domain}/education/teacher/attendance`} className="edu-btn edu-btn-primary edu-btn-compact">
              Pasar lista →
            </Link>
          </div>
        ))
      ) : (
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--edu-gray-400)', fontSize: 'var(--text-sm)' }}>Sin clases programadas para hoy.</p>
      )}

      <style>{`
        @media (max-width: 600px) { .edu-teacher-stats { grid-template-columns: 1fr !important; } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, loading, urgent }: { label: string; value: number | string; loading: boolean; urgent?: boolean }) {
  return (
    <div style={{
      border: `1px solid ${urgent && value !== 0 && value !== '—' ? 'var(--edu-warning)' : 'var(--edu-gray-200)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '20px 24px',
      background: urgent && value !== 0 && value !== '—' ? 'var(--edu-warning-bg)' : 'var(--edu-white)',
    }}>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--edu-gray-500)', margin: '0 0 8px' }}>
        {label}
      </p>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: '36px',
        fontWeight: 700,
        color: loading ? 'var(--edu-gray-200)' : 'var(--edu-navy)',
      }}>
        {loading ? '—' : value}
      </span>
    </div>
  );
}
