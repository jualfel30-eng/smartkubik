'use client';

import { useEffect, useState } from 'react';
import { educationApi } from '@/lib/educationApi';
import GradeRow, { type Grade } from '@/templates/EducationPortal/components/GradeRow';

export default function StudentGradesPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    educationApi.get<Grade[]>('/education/grades')
      .then(setGrades)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 3vw, 32px)', color: 'var(--edu-navy)', margin: '0 0 32px' }}>
        Mis Calificaciones
      </h1>

      {loading ? (
        [1, 2, 3, 4].map(i => (
          <div key={i} style={{ height: '72px', background: 'var(--edu-gray-100)', borderRadius: 'var(--radius-sm)', marginBottom: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))
      ) : grades.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--edu-gray-400)', fontSize: 'var(--text-base)', padding: '24px 0' }}>
          No hay calificaciones registradas para este período.
        </p>
      ) : (
        <div style={{ maxWidth: '720px' }}>
          {grades.map((g, i) => <GradeRow key={i} grade={g} />)}
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
    </div>
  );
}
