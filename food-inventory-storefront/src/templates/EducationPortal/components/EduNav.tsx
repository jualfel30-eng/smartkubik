'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { EduPublicConfig } from '../types';

interface EduNavProps {
  config: EduPublicConfig;
  domain: string;
}

export default function EduNav({ config, domain }: EduNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Institución', href: '#about' },
    { label: 'Programas', href: '#programs' },
    { label: 'Admisiones', href: '#access' },
    { label: 'Contacto', href: '#footer' },
  ];

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--section-px)',
      height: '72px',
      background: scrolled ? 'var(--edu-white)' : 'transparent',
      boxShadow: scrolled ? '0 1px 0 rgba(0,0,0,0.08)' : 'none',
      transition: 'background 200ms ease, box-shadow 200ms ease',
    }}>
      {/* Logo + nombre */}
      <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
        {config.logoUrl && (
          <img src={config.logoUrl} alt={config.institutionName} style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
        )}
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '20px',
          fontWeight: 700,
          color: scrolled ? 'var(--edu-navy)' : 'var(--edu-white)',
          transition: 'color 200ms ease',
        }}>
          {config.institutionName}
        </span>
      </a>

      {/* Links desktop */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }} className="edu-nav-desktop">
        {navLinks.map(link => (
          <a key={link.label} href={link.href} style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: scrolled ? 'var(--edu-gray-700)' : 'rgba(255,255,255,0.85)',
            textDecoration: 'none',
            transition: 'color 200ms ease',
          }}>
            {link.label}
          </a>
        ))}

        <Link href={`/${domain}/education/login`}
          className={`edu-btn edu-btn-compact ${scrolled ? 'edu-btn-primary' : 'edu-btn-ghost-dark'}`}
        >
          Portal →
        </Link>
      </div>

      {/* Hamburger mobile */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          display: 'none',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          color: scrolled ? 'var(--edu-navy)' : 'var(--edu-white)',
        }}
        className="edu-nav-mobile-toggle"
        aria-label="Menú"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {mobileOpen
            ? <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            : <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round"/>
          }
        </svg>
      </button>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{
          position: 'absolute',
          top: '72px',
          left: 0,
          right: 0,
          background: 'var(--edu-white)',
          borderTop: '1px solid var(--edu-gray-200)',
          padding: '16px var(--section-px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {navLinks.map(link => (
            <a key={link.label} href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-base)',
                fontWeight: 500,
                color: 'var(--edu-navy)',
                textDecoration: 'none',
              }}>
              {link.label}
            </a>
          ))}
          <Link href={`/${domain}/education/login`} className="edu-btn edu-btn-primary edu-btn-compact" style={{ alignSelf: 'flex-start' }}>
            Portal →
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .edu-nav-desktop { display: none !important; }
          .edu-nav-mobile-toggle { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}
