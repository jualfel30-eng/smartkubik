'use client';

import { useState } from 'react';

export interface ScheduleBlock {
  dayOfWeek: number; // 1=Mon, 5=Fri
  startTime: string; // "08:00"
  endTime: string;   // "09:30"
  subjectName: string;
  teacherName?: string;
  classroomName?: string;
}

interface WeeklyScheduleProps {
  blocks: ScheduleBlock[];
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const TIME_SLOTS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

function isCurrentBlock(block: ScheduleBlock): boolean {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const currentDay = day === 0 ? 7 : day;
  if (block.dayOfWeek !== currentDay) return false;
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  return time >= block.startTime && time < block.endTime;
}

export default function WeeklySchedule({ blocks }: WeeklyScheduleProps) {
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay();
    return d === 0 || d === 6 ? 1 : d;
  });

  const dayBlocks = (day: number) => blocks.filter(b => b.dayOfWeek === day);

  return (
    <>
      {/* Desktop: CSS Grid */}
      <div className="edu-schedule-desktop">
        <div style={{
          display: 'grid',
          gridTemplateColumns: `80px repeat(5, 1fr)`,
          gap: '4px',
        }}>
          {/* Header */}
          <div />
          {DAYS.map(d => (
            <div key={d} style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--edu-gray-500)',
              textAlign: 'center',
              padding: '8px 0',
            }}>
              {d}
            </div>
          ))}

          {/* Slots */}
          {TIME_SLOTS.map(time => (
            <>
              <div key={`time-${time}`} style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                color: 'var(--edu-gray-400)',
                paddingTop: '8px',
                paddingRight: '12px',
                textAlign: 'right',
              }}>
                {time}
              </div>
              {[1, 2, 3, 4, 5].map(day => {
                const block = dayBlocks(day).find(b => b.startTime === time);
                const isCurrent = block ? isCurrentBlock(block) : false;
                return (
                  <div key={`${day}-${time}`} style={{
                    minHeight: '64px',
                    borderRadius: 'var(--radius-sm)',
                    padding: block ? '8px 10px' : undefined,
                    background: block
                      ? isCurrent ? 'var(--edu-navy)' : 'var(--edu-white)'
                      : 'transparent',
                    border: block && !isCurrent ? '1px solid var(--edu-gray-100)' : undefined,
                  }}>
                    {block && (
                      <>
                        <p style={{
                          fontFamily: 'var(--font-body)',
                          fontWeight: 600,
                          fontSize: '13px',
                          color: isCurrent ? 'var(--edu-white)' : 'var(--edu-gray-900)',
                          margin: 0,
                        }}>
                          {block.subjectName}
                        </p>
                        {block.teacherName && (
                          <p style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '11px',
                            color: isCurrent ? 'rgba(255,255,255,0.65)' : 'var(--edu-gray-500)',
                            margin: '2px 0 0',
                          }}>
                            {block.teacherName}
                          </p>
                        )}
                        <p style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '11px',
                          color: isCurrent ? 'rgba(255,255,255,0.5)' : 'var(--edu-gray-400)',
                          margin: '2px 0 0',
                        }}>
                          {block.startTime}–{block.endTime}
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Mobile: pills de día + lista */}
      <div className="edu-schedule-mobile">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
          {DAYS.map((d, i) => (
            <button
              key={d}
              onClick={() => setSelectedDay(i + 1)}
              style={{
                padding: '8px 16px',
                borderRadius: '100px',
                border: 'none',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: selectedDay === i + 1 ? 'var(--edu-navy)' : 'var(--edu-gray-100)',
                color: selectedDay === i + 1 ? 'white' : 'var(--edu-gray-700)',
                transition: 'background 150ms, color 150ms',
              }}
            >
              {d}
            </button>
          ))}
        </div>

        {dayBlocks(selectedDay).length === 0 ? (
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--edu-gray-500)', fontSize: 'var(--text-sm)' }}>
            Sin clases este día.
          </p>
        ) : (
          dayBlocks(selectedDay).map((block, i) => {
            const isCurrent = isCurrentBlock(block);
            return (
              <div key={i} style={{
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                marginBottom: '8px',
                background: isCurrent ? 'var(--edu-navy)' : 'var(--edu-white)',
                border: isCurrent ? 'none' : '1px solid var(--edu-gray-100)',
              }}>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  fontSize: 'var(--text-base)',
                  color: isCurrent ? 'var(--edu-white)' : 'var(--edu-gray-900)',
                  margin: 0,
                }}>
                  {block.subjectName}
                </p>
                {block.teacherName && (
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    color: isCurrent ? 'rgba(255,255,255,0.65)' : 'var(--edu-gray-500)',
                    margin: '4px 0 0',
                  }}>
                    {block.teacherName}
                  </p>
                )}
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  color: isCurrent ? 'rgba(255,255,255,0.5)' : 'var(--edu-gray-400)',
                  margin: '2px 0 0',
                }}>
                  {block.startTime} – {block.endTime}
                  {block.classroomName ? ` · ${block.classroomName}` : ''}
                </p>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        @media (min-width: 769px) { .edu-schedule-mobile { display: none !important; } }
        @media (max-width: 768px) { .edu-schedule-desktop { display: none !important; } }
      `}</style>
    </>
  );
}
