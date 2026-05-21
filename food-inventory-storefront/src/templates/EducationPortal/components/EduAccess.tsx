'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { EduPublicConfig } from '../types';

interface EduAccessProps {
  config: EduPublicConfig;
  domain: string;
}

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
    <circle cx="8" cy="8" r="7" stroke="var(--edu-gold)" strokeWidth="1.5"/>
    <path d="M5 8l2 2 4-4" stroke="var(--edu-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CARDS = [
  {
    role: 'Estudiante',
    type: 'student',
    features: ['Mis calificaciones', 'Horario semanal', 'Registro de asistencia', 'Estado de cuotas'],
    cta: 'Iniciar sesión como Estudiante',
    ctaClass: 'edu-btn-accent',
  },
  {
    role: 'Docente',
    type: 'teacher',
    features: ['Mi horario de clases', 'Pasar lista de asistencia', 'Cargar calificaciones', 'Historial de registros'],
    cta: 'Iniciar sesión como Docente',
    ctaClass: 'edu-btn-primary',
  },
];

export default function EduAccess({ config, domain }: EduAccessProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section id="access" style={{
      background: 'var(--edu-navy)',
      padding: 'var(--section-py) var(--section-px)',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', maxWidth: '560px', margin: '0 auto 64px' }}>
        <span className="edu-label" style={{ marginBottom: '16px' }}>Portal Institucional</span>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(32px, 4vw, 48px)',
          color: 'var(--edu-white)',
          margin: '0 0 16px',
          lineHeight: 'var(--leading-display)',
        }}>
          Tu acceso a la vida académica
        </h2>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-base)',
          color: 'rgba(255,255,255,0.6)',
          lineHeight: 'var(--leading-normal)',
          margin: 0,
        }}>
          Calificaciones, horarios, asistencia y cuotas desde un solo lugar.
        </p>
      </div>

      {/* Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        maxWidth: 'var(--container-max)',
        margin: '0 auto',
      }} className="edu-access-grid">
        {CARDS.map((card, i) => (
          <div
            key={card.type}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{
              border: `1px solid ${hovered === i ? 'var(--edu-gold-border)' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '40px',
              transition: 'border-color 200ms ease',
            }}
          >
            {/* Ícono */}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--edu-gold-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
            }}>
              {card.type === 'student' ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2l8 4-8 4-8-4 8-4z" stroke="var(--edu-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 10l8 4 8-4" stroke="var(--edu-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="3" width="14" height="14" rx="2" stroke="var(--edu-gold)" strokeWidth="1.5"/>
                  <path d="M7 8h6M7 11h4" stroke="var(--edu-gold)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
            </div>

            {/* Título */}
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '28px',
              color: 'var(--edu-white)',
              margin: '0 0 24px',
              fontWeight: 700,
            }}>
              {card.role}
            </h3>

            {/* Lista */}
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 36px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {card.features.map(f => (
                <li key={f} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <CheckIcon />
                  <span style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    color: 'rgba(255,255,255,0.75)',
                    lineHeight: 1.5,
                  }}>
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              href={`/${domain}/education/login?type=${card.type}`}
              className={`edu-btn ${card.ctaClass}`}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {card.cta}
            </Link>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .edu-access-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
