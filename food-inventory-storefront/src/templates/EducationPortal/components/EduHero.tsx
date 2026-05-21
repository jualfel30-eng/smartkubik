'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import type { EduPublicConfig } from '../types';

interface EduHeroProps {
  config: EduPublicConfig;
  domain: string;
}

export default function EduHero({ config, domain }: EduHeroProps) {
  const tagRef = useRef<HTMLSpanElement>(null);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const ctasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const items = [
      { el: tagRef.current, delay: 200 },
      { el: h1Ref.current, delay: 400, clip: true },
      { el: taglineRef.current, delay: 750 },
      { el: ctasRef.current, delay: 1000 },
    ];

    items.forEach(({ el, delay, clip }) => {
      if (!el) return;
      if (clip) {
        el.style.clipPath = 'inset(100% 0 0 0)';
        el.style.transition = `clip-path 850ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`;
        requestAnimationFrame(() => { el.style.clipPath = 'inset(0% 0 0 0)'; });
      } else {
        el.style.opacity = '0';
        el.style.transform = 'translateY(16px)';
        el.style.transition = `opacity 600ms ease ${delay}ms, transform 600ms ease ${delay}ms`;
        requestAnimationFrame(() => {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        });
      }
    });
  }, []);

  const gridPattern = `
    <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <defs>
        <pattern id="edu-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" stroke-width="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#edu-grid)" opacity="0.04"/>
    </svg>
  `;

  return (
    <section style={{ position: 'relative', height: '100svh', overflow: 'hidden' }}>
      {/* Fondo */}
      {config.bannerUrl ? (
        <>
          <Image
            src={config.bannerUrl}
            alt={config.institutionName}
            fill
            style={{ objectFit: 'cover' }}
            priority
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(12,31,63,0.72) 0%, rgba(12,31,63,0.45) 60%, rgba(12,31,63,0.65) 100%)',
          }} />
        </>
      ) : (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'var(--edu-navy)' }} />
          <div
            style={{ position: 'absolute', inset: 0 }}
            dangerouslySetInnerHTML={{ __html: gridPattern }}
          />
        </>
      )}

      {/* Contenido */}
      <div style={{
        position: 'absolute',
        bottom: '15%',
        left: 'var(--section-px)',
        right: 'var(--section-px)',
        maxWidth: '860px',
      }}>
        <span ref={tagRef} className="edu-label" style={{ color: 'var(--edu-gold)', marginBottom: '20px' }}>
          Excelencia Educativa · Desde {config.foundedYear || '1998'}
        </span>

        <h1 ref={h1Ref} style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-hero)',
          fontWeight: 700,
          lineHeight: 'var(--leading-display)',
          color: 'var(--edu-white)',
          margin: '0 0 24px',
        }}>
          {config.institutionName}
        </h1>

        <p ref={taglineRef} style={{
          fontFamily: 'var(--font-body)',
          fontSize: '20px',
          lineHeight: 'var(--leading-normal)',
          color: 'rgba(255,255,255,0.72)',
          maxWidth: '500px',
          margin: '0 0 44px',
        }}>
          {config.tagline || 'Formando líderes con valores, conocimiento y vocación de servicio.'}
        </p>

        <div ref={ctasRef} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <a href="#access" className="edu-btn edu-btn-accent">Acceder al Portal</a>
          <a href="#programs" className="edu-btn edu-btn-ghost-dark">Ver Programas</a>
        </div>
      </div>

      {/* Scroll indicator — solo desktop */}
      <div style={{
        position: 'absolute',
        right: '48px',
        bottom: '48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }} className="edu-scroll-indicator">
        <span style={{
          fontFamily: 'var(--font-body)',
          fontSize: '10px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.5)',
          writingMode: 'vertical-rl',
        }}>
          Descubre más
        </span>
        <div style={{
          width: '1px',
          background: 'rgba(255,255,255,0.3)',
          animation: 'scrollLine 1.8s ease-in-out infinite',
        }} />
      </div>

      <style>{`
        @media (max-width: 768px) {
          .edu-scroll-indicator { display: none !important; }
        }
      `}</style>
    </section>
  );
}
