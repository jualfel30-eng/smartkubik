'use client';

import { useEffect, useState } from 'react';
import { educationApi } from '@/lib/educationApi';
import TuitionStatusCard, { type Tuition } from '@/templates/EducationPortal/components/TuitionStatusCard';

export default function StudentPaymentsPage() {
  const [tuitions, setTuitions] = useState<Tuition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    educationApi.get<Tuition[]>('/education/tuition/my')
      .then(data => {
        // Ordenar: vencidas → pendientes → pagadas
        const order = { overdue: 0, pending: 1, paid: 2 };
        setTuitions([...data].sort((a, b) => order[a.status] - order[b.status]));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const overdue = tuitions.filter(t => t.status === 'overdue');
  const pending = tuitions.filter(t => t.status === 'pending');
  const paid = tuitions.filter(t => t.status === 'paid');

  return (
    <div style={{ maxWidth: '680px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 3vw, 32px)', color: 'var(--edu-navy)', margin: '0 0 32px' }}>
        Estado de Cuotas
      </h1>

      {loading ? (
        [1, 2, 3].map(i => (
          <div key={i} style={{ height: '80px', background: 'var(--edu-gray-100)', borderRadius: 'var(--radius-sm)', marginBottom: '12px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))
      ) : (
        <>
          {overdue.length > 0 && (
            <Section title="Cuotas Vencidas" items={overdue} />
          )}
          {pending.length > 0 && (
            <Section title="Cuotas Pendientes" items={pending} />
          )}
          {paid.length > 0 && (
            <Section title="Historial de Pagos" items={paid} />
          )}
          {tuitions.length === 0 && (
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--edu-gray-400)' }}>Sin registros de cuotas.</p>
          )}
        </>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
    </div>
  );
}

function Section({ title, items }: { title: string; items: Tuition[] }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--edu-gray-700)', margin: '0 0 16px' }}>
        {title}
      </h2>
      {items.map(t => <TuitionStatusCard key={t._id} tuition={t} />)}
    </div>
  );
}
