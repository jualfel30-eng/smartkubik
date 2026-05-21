'use client';

import { useState } from 'react';
import type { EduPublicConfig } from '../types';

interface EduProgramsProps {
  config: EduPublicConfig;
}

const DEFAULT_PROGRAMS = [
  { name: 'Educación Inicial', level: 'Nivel preescolar — 3 a 6 años' },
  { name: 'Educación Primaria', level: 'Primer a Sexto grado — 6 a 12 años' },
  { name: 'Educación Media General', level: 'Primer a Quinto año — 12 a 17 años' },
  { name: 'Bachillerato en Ciencias', level: 'Mención Ciencias — Ciclo diversificado' },
  { name: 'Bachillerato en Humanidades', level: 'Mención Humanidades — Ciclo diversificado' },
];

export default function EduPrograms({ config }: EduProgramsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const programs = config.programs?.length ? config.programs : DEFAULT_PROGRAMS;

  return (
    <section id="programs" style={{
      background: 'var(--edu-cream)',
      padding: 'var(--section-py) var(--section-px)',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '5fr 7fr',
        gap: 'var(--gap-xl)',
        maxWidth: 'var(--container-max)',
        margin: '0 auto',
        alignItems: 'start',
      }} className="edu-programs-grid">
        {/* Columna izquierda — sticky */}
        <div style={{ position: 'sticky', top: '120px' }} className="edu-programs-sticky">
          <span className="edu-label" style={{ marginBottom: '16px' }}>Formación Académica</span>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-section)',
            color: 'var(--edu-navy)',
            lineHeight: 'var(--leading-display)',
            margin: 0,
          }}>
            Oferta<br />Académica
          </h2>
          <div style={{
            width: '48px',
            height: '3px',
            background: 'var(--edu-gold)',
            marginTop: '24px',
          }} />
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-base)',
            color: 'var(--edu-gray-700)',
            lineHeight: 'var(--leading-normal)',
            marginTop: '24px',
            maxWidth: '280px',
          }}>
            Programas diseñados para desarrollar excelencia académica y valores humanos en cada etapa formativa.
          </p>
        </div>

        {/* Columna derecha — lista editorial */}
        <div>
          {programs.map((program, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                borderTop: '1px solid var(--edu-gray-200)',
                padding: '24px 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <div>
                <span style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  fontSize: 'var(--text-lg)',
                  color: 'var(--edu-navy)',
                }}>
                  {program.name}
                </span>
                <span style={{
                  display: 'block',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--edu-gray-500)',
                  marginTop: '4px',
                }}>
                  {program.level}
                </span>
              </div>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                style={{
                  color: 'var(--edu-gold)',
                  opacity: hoveredIndex === i ? 1 : 0,
                  transform: hoveredIndex === i ? 'translateX(0)' : 'translateX(-8px)',
                  transition: 'opacity 200ms ease, transform 200ms ease',
                  flexShrink: 0,
                }}
              >
                <path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--edu-gray-200)' }} />
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .edu-programs-grid { grid-template-columns: 1fr !important; }
          .edu-programs-sticky { position: static !important; }
        }
      `}</style>
    </section>
  );
}
