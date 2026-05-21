'use client';

import { useState, useMemo } from 'react';
import { educationApi } from '@/lib/educationApi';

export interface AttendanceStudent {
  id: string;
  name: string;
}

export interface Classroom {
  id: string;
  name: string;
}

type AttendanceStatus = 'P' | 'A' | 'T';

interface AttendanceSheetProps {
  classrooms: Classroom[];
  onSaved?: () => void;
}

export default function AttendanceSheet({ classrooms, onSaved }: AttendanceSheetProps) {
  const [classroomId, setClassroomId] = useState(classrooms[0]?.id || '');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleClassroomChange = async (id: string) => {
    setClassroomId(id);
    setLoadingStudents(true);
    try {
      const data = await educationApi.get<AttendanceStudent[]>(`/education/classrooms/${id}/students`);
      setStudents(data);
      setAttendance(Object.fromEntries(data.map(s => [s.id, 'P' as AttendanceStatus])));
    } catch {
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const mark = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const counts = useMemo(() => {
    const vals = Object.values(attendance);
    return {
      present: vals.filter(v => v === 'P').length,
      absent: vals.filter(v => v === 'A').length,
      late: vals.filter(v => v === 'T').length,
    };
  }, [attendance]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        studentId,
        status: status === 'P' ? 'present' : status === 'A' ? 'absent' : 'late',
        classroomId,
        date,
      }));
      await educationApi.post('/education/attendance', { records });
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    color: 'var(--edu-navy)',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--edu-navy)',
    outline: 'none',
    padding: '8px 0',
    cursor: 'pointer',
  };

  return (
    <div style={{ maxWidth: '680px' }}>
      {/* Selector salón + fecha */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <select value={classroomId} onChange={e => handleClassroomChange(e.target.value)} style={inputStyle}>
          {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Contador en tiempo real */}
      {students.length > 0 && (
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          color: 'var(--edu-gray-500)',
          marginBottom: '24px',
        }}>
          {counts.present} presentes · {counts.absent} ausentes · {counts.late} tarde
        </p>
      )}

      {loadingStudents && (
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--edu-gray-500)', fontSize: 'var(--text-sm)' }}>
          Cargando alumnos...
        </p>
      )}

      {/* Lista de alumnos */}
      {students.map(student => {
        const current = attendance[student.id] || 'P';
        return (
          <div key={student.id} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 0',
            borderBottom: '1px solid var(--edu-gray-100)',
          }}>
            <span style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: 'var(--text-base)',
              color: 'var(--edu-gray-900)',
            }}>
              {student.name}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['P', 'A', 'T'] as AttendanceStatus[]).map(status => (
                <button
                  key={status}
                  onClick={() => mark(student.id, status)}
                  style={{
                    minWidth: '52px',
                    minHeight: '52px',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 700,
                    fontSize: 'var(--text-sm)',
                    cursor: 'pointer',
                    background: current === status
                      ? status === 'P' ? 'var(--edu-success)' : status === 'A' ? 'var(--edu-danger)' : 'var(--edu-warning)'
                      : 'var(--edu-gray-100)',
                    color: current === status ? 'white' : 'var(--edu-gray-500)',
                    transition: 'background 150ms ease, color 150ms ease',
                  }}
                >
                  {status === 'P' ? 'Pres' : status === 'A' ? 'Aus' : 'Tarde'}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {students.length > 0 && (
        <div style={{
          position: 'sticky',
          bottom: 0,
          padding: '16px 0',
          background: 'linear-gradient(to top, var(--edu-gray-50) 80%, transparent)',
        }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="edu-btn edu-btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {saving ? 'Guardando...' : 'Guardar Asistencia'}
          </button>
        </div>
      )}
    </div>
  );
}
