'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { educationApi } from '@/lib/educationApi';
import { useEducationAuth } from '@/contexts/EducationAuthContext';
import AttendanceSummary from '@/templates/EducationPortal/components/AttendanceSummary';
import GradeRow, { type Grade } from '@/templates/EducationPortal/components/GradeRow';
import TuitionStatusCard, { type Tuition } from '@/templates/EducationPortal/components/TuitionStatusCard';

interface DashboardSummary {
  attendancePct: number;
  present: number;
  absent: number;
  late: number;
  recentGrades: Grade[];
  pendingTuitions: Tuition[];
}

export default function StudentDashboard() {
  const { user } = useEducationAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    educationApi.get<DashboardSummary>('/education/dashboard/summary')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;

  return (
    <div>
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(24px, 3vw, 36px)',
        color: 'var(--edu-navy)',
        margin: '0 0 8px',
      }}>
        Hola, {user?.name?.split(' ')[0] || 'Estudiante'}
      </h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--edu-gray-500)', margin: '0 0 40px' }}>
        Resumen del período académico
      </p>

      {/* Asistencia */}
      {data && (
        <div style={{ marginBottom: '40px' }}>
          <AttendanceSummary
            attendancePct={data.attendancePct}
            present={data.present}
            absent={data.absent}
            late={data.late}
          />
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '40px',
        alignItems: 'start',
      }} className="edu-dashboard-grid">
        {/* Calificaciones recientes */}
        <section>
          <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--edu-gray-700)', margin: '0 0 4px' }}>
            Últimas Calificaciones
          </h2>
          <div>
            {data?.recentGrades?.length ? (
              data.recentGrades.map((g, i) => <GradeRow key={i} grade={g} />)
            ) : (
              <p style={{ fontFamily: 'var(--font-body)', color: 'var(--edu-gray-400)', fontSize: 'var(--text-sm)', padding: '16px 0' }}>Sin calificaciones registradas.</p>
            )}
          </div>
        </section>

        {/* Cuotas */}
        <section>
          <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--edu-gray-700)', margin: '0 0 16px' }}>
            Estado de Cuotas
          </h2>
          {data?.pendingTuitions?.length ? (
            data.pendingTuitions.map(t => <TuitionStatusCard key={t._id} tuition={t} />)
          ) : (
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--edu-gray-400)', fontSize: 'var(--text-sm)' }}>Sin cuotas pendientes.</p>
          )}
        </section>
      </div>

      <style>{`
        @media (max-width: 768px) { .edu-dashboard-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: '80px', background: 'var(--edu-gray-100)', borderRadius: 'var(--radius-md)', marginBottom: '16px', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
    </div>
  );
}
