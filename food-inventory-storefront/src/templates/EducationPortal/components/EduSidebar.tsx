'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEducationAuth } from '@/contexts/EducationAuthContext';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M3 9L9 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 7v7h3v-4h2v4h3V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="3" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M6 2v2M12 2v2M2 7h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const BookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M3 4a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V4z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M6 6h6M6 9h6M6 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M6 9l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ReceiptIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M4 2h10v14l-2-1.5L10 16l-2-1.5L6 16l-2-1.5V2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 6h6M6 9h6M6 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M7 16H4a2 2 0 01-2-2V4a2 2 0 012-2h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 13l4-4-4-4M16 9H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface EduSidebarProps {
  domain: string;
  institutionName: string;
  logoUrl?: string;
}

export default function EduSidebar({ domain, institutionName, logoUrl }: EduSidebarProps) {
  const pathname = usePathname();
  const { user, logout, isStudent, isTeacher } = useEducationAuth();
  const base = `/${domain}/education`;

  const studentNav: NavItem[] = [
    { href: `${base}/student`, label: 'Dashboard', icon: <HomeIcon /> },
    { href: `${base}/student/schedule`, label: 'Mi Horario', icon: <CalendarIcon /> },
    { href: `${base}/student/grades`, label: 'Calificaciones', icon: <BookIcon /> },
    { href: `${base}/student/attendance`, label: 'Asistencia', icon: <CheckIcon /> },
    { href: `${base}/student/payments`, label: 'Cuotas', icon: <ReceiptIcon /> },
  ];

  const teacherNav: NavItem[] = [
    { href: `${base}/teacher`, label: 'Dashboard', icon: <HomeIcon /> },
    { href: `${base}/teacher/schedule`, label: 'Mi Horario', icon: <CalendarIcon /> },
    { href: `${base}/teacher/attendance`, label: 'Pasar Lista', icon: <CheckIcon /> },
    { href: `${base}/teacher/grades`, label: 'Calificaciones', icon: <BookIcon /> },
  ];

  const navItems = isTeacher ? teacherNav : studentNav;

  return (
    <aside className="edu-sidebar">
      {/* Logo + nombre */}
      <div style={{ padding: '0 24px 32px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {logoUrl && (
          <img src={logoUrl} alt={institutionName} style={{ height: '32px', objectFit: 'contain', marginBottom: '12px' }} />
        )}
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '15px',
          fontWeight: 700,
          color: 'var(--edu-white)',
          margin: 0,
          lineHeight: 1.3,
        }}>
          {institutionName}
        </p>
        {user && (
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.45)',
            margin: '6px 0 0',
          }}>
            {user.name}
          </p>
        )}
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, paddingTop: '16px' }}>
        {navItems.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`edu-sidebar-link ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '16px 0 0' }}>
        <button
          onClick={logout}
          className="edu-sidebar-link"
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <LogoutIcon />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
