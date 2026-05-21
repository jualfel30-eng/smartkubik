import type { EduPublicConfig } from '../types';

interface EduQuoteProps {
  config: EduPublicConfig;
}

export default function EduQuote({ config }: EduQuoteProps) {
  const quote = config.quote;

  return (
    <section style={{
      background: 'var(--edu-navy)',
      padding: 'clamp(80px, 8vw, 120px) var(--section-px)',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', position: 'relative' }}>
        {/* Comilla decorativa */}
        <span style={{
          position: 'absolute',
          top: '-40px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-display)',
          fontSize: '120px',
          color: 'var(--edu-gold)',
          opacity: 0.25,
          lineHeight: 1,
          userSelect: 'none',
          pointerEvents: 'none',
        }}>
          &ldquo;
        </span>

        <blockquote style={{ margin: 0, paddingTop: '32px' }}>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 'clamp(24px, 3.5vw, 36px)',
            lineHeight: 1.45,
            color: 'var(--edu-white)',
            margin: 0,
          }}>
            {quote?.text || 'Esta institución cambió mi forma de ver el mundo. No solo aprendí, crecí.'}
          </p>

          <footer style={{
            marginTop: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}>
            {quote?.avatarUrl && (
              <img
                src={quote.avatarUrl}
                alt=""
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--edu-gold)',
                }}
              />
            )}
            <cite style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              color: 'rgba(255,255,255,0.6)',
              fontStyle: 'normal',
              letterSpacing: '0.05em',
            }}>
              — {quote?.author || 'Egresado, Promoción 2023'}
            </cite>
          </footer>
        </blockquote>
      </div>
    </section>
  );
}
