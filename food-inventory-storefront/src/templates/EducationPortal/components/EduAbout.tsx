import Image from 'next/image';
import type { EduPublicConfig } from '../types';

interface EduAboutProps {
  config: EduPublicConfig;
}

const VALUES = [
  'Excelencia académica',
  'Formación en valores',
  'Innovación pedagógica',
  'Compromiso comunitario',
];

export default function EduAbout({ config }: EduAboutProps) {
  const hasPhoto = !!config.bannerUrl;

  return (
    <section id="about" style={{
      background: 'var(--edu-cream)',
      padding: 'var(--section-py) var(--section-px)',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--gap-xl)',
        maxWidth: 'var(--container-max)',
        margin: '0 auto',
        alignItems: 'center',
      }} className="edu-about-grid">
        {/* Imagen o bloque navy */}
        <div style={{ position: 'relative', aspectRatio: '4/5', overflow: 'hidden' }}>
          {hasPhoto ? (
            <Image
              src={config.bannerUrl!}
              alt={`Instalaciones de ${config.institutionName}`}
              fill
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div style={{ background: 'var(--edu-navy)', position: 'absolute', inset: 0 }}>
              <div style={{
                position: 'absolute',
                bottom: '32px',
                left: '32px',
              }}>
                <p style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: '20px',
                  color: 'var(--edu-white)',
                  margin: 0,
                  lineHeight: 1.6,
                }}>
                  Est. {config.foundedYear || '2000'}<br />
                  Sede principal<br />
                  {config.contactInfo?.address || ''}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Texto */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '24px' }}>
          <span className="edu-label">Nuestra Historia</span>

          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 3.5vw, 44px)',
            color: 'var(--edu-navy)',
            lineHeight: 'var(--leading-display)',
            margin: 0,
          }}>
            {(config as any).aboutTitle || 'Décadas formando generaciones'}
          </h2>

          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-base)',
            lineHeight: 'var(--leading-normal)',
            color: 'var(--edu-gray-700)',
            margin: 0,
          }}>
            {(config as any).aboutText || 'Institución educativa comprometida con la formación integral de sus estudiantes, combinando excelencia académica con desarrollo humano y valores sólidos.'}
          </p>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {VALUES.map(v => (
              <li key={v} style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-base)',
                color: 'var(--edu-gray-700)',
                display: 'flex',
                gap: '12px',
                alignItems: 'baseline',
              }}>
                <span style={{ color: 'var(--edu-gold)', fontWeight: 700, flexShrink: 0 }}>—</span>
                {v}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .edu-about-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
