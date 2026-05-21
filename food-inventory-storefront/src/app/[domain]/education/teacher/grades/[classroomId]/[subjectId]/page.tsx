'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { educationApi } from '@/lib/educationApi';

interface StudentGradeEntry {
  studentId: string;
  studentName: string;
  gradeId?: string;
  score: number | null;
  maxScore: number;
  period: string;
}

export default function GradeEntryPage() {
  const params = useParams<{ domain: string; classroomId: string; subjectId: string }>();
  const router = useRouter();
  const { domain, classroomId, subjectId } = params;

  const [entries, setEntries] = useState<StudentGradeEntry[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    educationApi.get<StudentGradeEntry[]>(`/education/grades/classroom/${classroomId}/subject/${subjectId}`)
      .then(data => {
        setEntries(data);
        setScores(Object.fromEntries(data.map(e => [e.studentId, e.score !== null ? String(e.score) : ''])));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [classroomId, subjectId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = entries.map(e => ({
        studentId: e.studentId,
        gradeId: e.gradeId,
        score: scores[e.studentId] !== '' ? Number(scores[e.studentId]) : null,
        classroomId,
        subjectId,
      }));
      await educationApi.post('/education/grades/batch', { updates });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const subject = entries[0]?.period ? `Período: ${entries[0].period}` : '';
  const maxScore = entries[0]?.maxScore || 20;

  return (
    <div style={{ maxWidth: '680px' }}>
      <button
        onClick={() => router.back()}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          color: 'var(--edu-gray-500)',
          padding: '0 0 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        ← Volver
      </button>

      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 3vw, 32px)', color: 'var(--edu-navy)', margin: '0 0 8px' }}>
        Cargar Calificaciones
      </h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--edu-gray-500)', margin: '0 0 32px' }}>
        {subject} · Escala: 1–{maxScore}
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
          ✓ Calificaciones guardadas correctamente
        </div>
      )}

      {loading ? (
        <div style={{ height: '200px', background: 'var(--edu-gray-100)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ) : (
        <>
          {entries.map(entry => (
            <div key={entry.studentId} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 0',
              borderBottom: '1px solid var(--edu-gray-100)',
              gap: '16px',
            }}>
              <span style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: 'var(--text-base)',
                color: 'var(--edu-gray-900)',
                flex: 1,
              }}>
                {entry.studentName}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  min={1}
                  max={maxScore}
                  value={scores[entry.studentId] ?? ''}
                  onChange={e => setScores(prev => ({ ...prev, [entry.studentId]: e.target.value }))}
                  placeholder="—"
                  style={{
                    width: '72px',
                    border: 'none',
                    borderBottom: '2px solid var(--edu-gray-300)',
                    background: 'transparent',
                    fontFamily: 'var(--font-display)',
                    fontSize: '20px',
                    fontWeight: 700,
                    color: 'var(--edu-navy)',
                    textAlign: 'center',
                    outline: 'none',
                    padding: '4px 0',
                    minHeight: '48px',
                  }}
                  onFocus={e => (e.target.style.borderBottomColor = 'var(--edu-navy)')}
                  onBlur={e => (e.target.style.borderBottomColor = 'var(--edu-gray-300)')}
                />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--edu-gray-400)' }}>
                  /{maxScore}
                </span>
              </div>
            </div>
          ))}

          <div style={{
            position: 'sticky',
            bottom: 0,
            padding: '16px 0',
            background: 'linear-gradient(to top, var(--edu-gray-50) 80%, transparent)',
            marginTop: '8px',
          }}>
            <button
              onClick={handleSave}
              disabled={saving}
              className="edu-btn edu-btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {saving ? 'Guardando...' : 'Guardar Calificaciones'}
            </button>
          </div>
        </>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
    </div>
  );
}
