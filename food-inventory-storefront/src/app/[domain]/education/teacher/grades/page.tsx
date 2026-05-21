'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { educationApi } from '@/lib/educationApi';

interface ClassroomGradeSummary {
  classroomId: string;
  classroomName: string;
  subjects: { subjectId: string; subjectName: string; graded: number; total: number }[];
}

export default function TeacherGradesPage() {
  const params = useParams<{ domain: string }>();
  const domain = params.domain;
  const [data, setData] = useState<ClassroomGradeSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    educationApi.get<ClassroomGradeSummary[]>('/education/grades/teacher-overview')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 3vw, 32px)', color: 'var(--edu-navy)', margin: '0 0 32px' }}>
        Calificaciones
      </h1>

      {loading ? (
        [1, 2].map(i => (
          <div key={i} style={{ height: '120px', background: 'var(--edu-gray-100)', borderRadius: 'var(--radius-md)', marginBottom: '16px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))
      ) : data.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--edu-gray-400)' }}>Sin salones asignados.</p>
      ) : (
        data.map(classroom => (
          <div key={classroom.classroomId} style={{
            border: '1px solid var(--edu-gray-200)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--edu-navy)', margin: '0 0 20px' }}>
              {classroom.classroomName}
            </h2>
            {classroom.subjects.map(s => (
              <div key={s.subjectId} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 0',
                borderBottom: '1px solid var(--edu-gray-100)',
              }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--edu-gray-900)', margin: 0 }}>
                    {s.subjectName}
                  </p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--edu-gray-500)', margin: '4px 0 0' }}>
                    {s.graded} de {s.total} alumnos calificados
                  </p>
                  <div style={{ height: '3px', background: 'var(--edu-gray-100)', borderRadius: '2px', marginTop: '10px', width: '160px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${s.total > 0 ? (s.graded / s.total) * 100 : 0}%`, background: 'var(--edu-success)', borderRadius: '2px' }} />
                  </div>
                </div>
                <Link
                  href={`/${domain}/education/teacher/grades/${classroom.classroomId}/${s.subjectId}`}
                  className="edu-btn edu-btn-primary edu-btn-compact"
                >
                  Gestionar →
                </Link>
              </div>
            ))}
          </div>
        ))
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
    </div>
  );
}
