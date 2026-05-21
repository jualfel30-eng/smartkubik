import type { EduPublicConfig } from '../types';

interface EduFooterProps {
  config: EduPublicConfig;
}

export default function EduFooter({ config }: EduFooterProps) {
  const year = new Date().getFullYear();
  const contact = config.contactInfo;

  return (
    <footer id="footer" style={{
      background: 'var(--edu-navy)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      padding: '80px var(--section-px) 40px',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1fr',
        gap: '48px',
        maxWidth: 'var(--container-max)',
        margin: '0 auto',
      }} className="edu-footer-grid">
        {/* Col 1: Descripción */}
        <div>
          {config.logoUrl && (
            <img src={config.logoUrl} alt={config.institutionName} style={{ height: '40px', objectFit: 'contain', marginBottom: '16px' }} />
          )}
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--edu-white)',
            margin: '0 0 12px',
          }}>
            {config.institutionName}
          </p>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'rgba(255,255,255,0.5)',
            lineHeight: 'var(--leading-normal)',
            margin: '0 0 16px',
            maxWidth: '260px',
          }}>
            {config.tagline || 'Formando líderes con valores, conocimiento y vocación de servicio.'}
          </p>
          {contact?.email && (
            <a href={`mailto:${contact.email}`} style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              color: 'var(--edu-gold)',
              textDecoration: 'none',
            }}>
              {contact.email}
            </a>
          )}
        </div>

        {/* Col 2: Académico */}
        <FooterCol title="Académico" links={[
          { label: 'Programas', href: '#programs' },
          { label: 'Admisiones', href: '#access' },
          { label: 'Horarios', href: '#' },
          { label: 'Calificaciones', href: '#' },
        ]} />

        {/* Col 3: Institución */}
        <FooterCol title="Institución" links={[
          { label: 'Historia', href: '#about' },
          { label: 'Docentes', href: '#' },
          { label: 'Instalaciones', href: '#' },
          { label: 'Noticias', href: '#' },
        ]} />

        {/* Col 4: Contacto */}
        <div>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--edu-gold)',
            margin: '0 0 16px',
          }}>
            Contacto
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {contact?.address && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>
                {contact.address}
              </p>
            )}
            {contact?.phone && (
              <a href={`tel:${contact.phone}`} style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
                {contact.phone}
              </a>
            )}
            {contact?.email && (
              <a href={`mailto:${contact.email}`} style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
                {contact.email}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        marginTop: '64px',
        paddingTop: '32px',
        maxWidth: 'var(--container-max)',
        marginLeft: 'auto',
        marginRight: 'auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          color: 'rgba(255,255,255,0.35)',
          margin: 0,
        }}>
          © {year} {config.institutionName}. Todos los derechos reservados.
        </p>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          color: 'rgba(255,255,255,0.25)',
          margin: 0,
        }}>
          Powered by SmartKubik
        </p>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .edu-footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .edu-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p style={{
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--edu-gold)',
        margin: '0 0 16px',
      }}>
        {title}
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {links.map(link => (
          <li key={link.label}>
            <a href={link.href} style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              color: 'rgba(255,255,255,0.5)',
              textDecoration: 'none',
              transition: 'color 150ms ease',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
