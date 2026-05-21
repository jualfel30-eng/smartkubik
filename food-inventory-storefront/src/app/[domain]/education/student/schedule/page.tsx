'use client';

import { useEffect, useState } from 'react';
import { educationApi } from '@/lib/educationApi';
import WeeklySchedule, { type ScheduleBlock } from '@/templates/EducationPortal/components/WeeklySchedule';

export default function StudentSchedulePage() {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    educationApi.get<ScheduleBlock[]>('/education/schedules')
      .then(setBlocks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 3vw, 32px)', color: 'var(--edu-navy)', margin: '0 0 32px' }}>
        Mi Horario
      </h1>
      {loading ? (
        <div style={{ height: '200px', background: 'var(--edu-gray-100)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s ease-in-out infinite' }}>
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
        </div>
      ) : (
        <WeeklySchedule blocks={blocks} />
      )}
    </div>
  );
}
