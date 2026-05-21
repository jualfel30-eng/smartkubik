'use client';

import { useEffect, useState } from 'react';
import { educationApi } from '@/lib/educationApi';
import AttendanceSheet, { type Classroom } from '@/templates/EducationPortal/components/AttendanceSheet';

export default function TeacherAttendancePage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    educationApi.get<{ _id: string; name: string }[]>('/education/classrooms')
      .then(data => setClassrooms(data.map(c => ({ id: c._id, name: c.name }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 3vw, 32px)', color: 'var(--edu-navy)', margin: '0 0 8px' }}>
        Pasar Lista
      </h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--edu-gray-500)', margin: '0 0 32px' }}>
        Registra la asistencia diaria de tu salón
      </p>

      {saved && (
        <div style={{
          background: 'var(--edu-success-bg)',
          border: '1px solid var(--edu-success)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          marginBottom: '24px',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          color: 'var(--edu-success)',
          fontWeight: 600,
        }}>
          ✓ Asistencia guardada correctamente
        </div>
      )}

      {loading ? (
        <div style={{ height: '200px', background: 'var(--edu-gray-100)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ) : classrooms.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--edu-gray-400)' }}>No tienes salones asignados.</p>
      ) : (
        <AttendanceSheet classrooms={classrooms} onSaved={handleSaved} />
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
    </div>
  );
}
