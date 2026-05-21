import { Suspense } from 'react';
import EduLoginForm from '@/templates/EducationPortal/components/EduLoginForm';
import type { EduPublicConfig } from '@/templates/EducationPortal/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ domain: string }>;
}

async function getEduConfig(domain: string): Promise<EduPublicConfig> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${apiBase}/education/public/config/${domain}`, { cache: 'no-store' });
    if (res.ok) return res.json();
  } catch { /* fallback */ }
  return { institutionName: 'Portal Educativo' };
}

export default async function LoginPage({ params }: PageProps) {
  const { domain } = await params;
  const config = await getEduConfig(domain);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Columna izquierda — desktop únicamente */}
      <div className="edu-login-left" style={{
        width: '45%',
        background: 'var(--edu-navy)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        flexShrink: 0,
      }}>
        {/* Pattern SVG de fondo */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04 }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="login-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#login-grid)"/>
          </svg>
        </div>

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '340px' }}>
          {config.logoUrl && (
            <img src={config.logoUrl} alt={config.institutionName} style={{ height: '56px', objectFit: 'contain', marginBottom: '24px' }} />
          )}
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '28px',
            color: 'var(--edu-white)',
            margin: '0 0 24px',
            fontWeight: 700,
          }}>
            {config.institutionName}
          </h2>
          <div style={{ width: '40px', height: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 auto 24px' }} />
          {config.quote && (
            <>
              <p style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: '18px',
                color: 'rgba(255,255,255,0.8)',
                lineHeight: 1.6,
                margin: '0 0 16px',
              }}>
                &ldquo;{config.quote.text}&rdquo;
              </p>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.45)',
                margin: 0,
              }}>
                — {config.quote.author}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Columna derecha — formulario */}
      <div style={{
        flex: 1,
        background: 'var(--edu-cream)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Suspense>
          <EduLoginForm config={config} domain={domain} />
        </Suspense>
      </div>

      <style>{`
        @media (max-width: 768px) { .edu-login-left { display: none !important; } }
      `}</style>
    </div>
  );
}
