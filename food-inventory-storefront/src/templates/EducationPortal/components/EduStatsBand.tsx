'use client';

import { useEffect, useRef, useState } from 'react';
import type { EduPublicConfig } from '../types';

interface EduStatsBandProps {
  config: EduPublicConfig;
}

function useCountUp(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>(0);

  const start = () => {
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return { count, start };
}

interface StatItemProps {
  value: number;
  suffix: string;
  label: string;
  isLast: boolean;
}

function StatItem({ value, suffix, label, isLast }: StatItemProps) {
  const { count, start } = useCountUp(value);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        start();
      }
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [start]);

  return (
    <div ref={ref} style={{
      textAlign: 'center',
      padding: '0 24px',
      borderRight: isLast ? 'none' : '1px solid rgba(255,255,255,0.12)',
    }} className="edu-stat-item">
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(44px, 6vw, 64px)',
        fontWeight: 700,
        color: 'var(--edu-gold)',
        lineHeight: 1,
      }}>
        {count.toLocaleString()}
        <span style={{ fontSize: '50%' }}>{suffix}</span>
      </div>
      <p style={{
        fontFamily: 'var(--font-body)',
        fontSize: '13px',
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.55)',
        margin: '12px 0 0',
      }}>
        {label}
      </p>
    </div>
  );
}

export default function EduStatsBand({ config }: EduStatsBandProps) {
  const currentYear = new Date().getFullYear();

  const stats = [
    { value: config.totalStudents || 450, suffix: '+', label: 'Estudiantes Activos' },
    { value: config.totalTeachers || 32, suffix: '+', label: 'Docentes Certificados' },
    { value: currentYear - (config.foundedYear || 2000), suffix: '', label: 'Años de Trayectoria' },
    { value: 98, suffix: '%', label: 'Satisfacción de Egresados' },
  ];

  return (
    <section style={{
      background: 'var(--edu-navy)',
      padding: '80px var(--section-px)',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        maxWidth: 'var(--container-max)',
        margin: '0 auto',
      }} className="edu-stats-grid">
        {stats.map((stat, i) => (
          <StatItem
            key={stat.label}
            value={stat.value}
            suffix={stat.suffix}
            label={stat.label}
            isLast={i === stats.length - 1}
          />
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .edu-stats-grid { grid-template-columns: 1fr 1fr !important; gap: 40px; }
          .edu-stat-item { border-right: none !important; }
        }
      `}</style>
    </section>
  );
}
