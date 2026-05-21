'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEducationAuth } from '@/contexts/EducationAuthContext';

interface NavItem {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

const HomeIcon = (active: boolean) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M3 10l7-7 7 7" stroke={active ? 'var(--edu-navy)' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M5 8v8h4v-4h2v4h4V8" stroke={active ? 'var(--edu-navy)' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const CalIcon = (active: boolean) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="4" width="16" height="14" rx="2" stroke={active ? 'var(--edu-navy)' : 'currentColor'} strokeWidth="1.5"/>
    <path d="M7 2v2M13 2v2M2 8h16" stroke={active ? 'var(--edu-navy)' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const BookIcon = (active: boolean) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M4 5a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" stroke={active ? 'var(--edu-navy)' : 'currentColor'} strokeWidth="1.5"/>
    <path d="M7 7h6M7 10h6M7 13h3" stroke={active ? 'var(--edu-navy)' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const CheckIcon = (active: boolean) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="2" width="16" height="16" rx="2" stroke={active ? 'var(--edu-navy)' : 'currentColor'} strokeWidth="1.5"/>
    <path d="M6 10l3 3 5-5" stroke={active ? 'var(--edu-navy)' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ReceiptIcon = (active: boolean) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M5 2h10v16l-2.5-2L10 18l-2.5-2L5 18V2z" stroke={active ? 'var(--edu-navy)' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 7h6M7 10h6M7 13h3" stroke={active ? 'var(--edu-navy)' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

interface EduBottomNavProps {
  domain: string;
}

export default function EduBottomNav({ domain }: EduBottomNavProps) {
  const pathname = usePathname();
  const { isTeacher } = useEducationAuth();
  const base = `/${domain}/education`;

  const studentItems: NavItem[] = [
    { href: `${base}/student`, label: 'Inicio', icon: HomeIcon },
    { href: `${base}/student/schedule`, label: 'Horario', icon: CalIcon },
    { href: `${base}/student/grades`, label: 'Notas', icon: BookIcon },
    { href: `${base}/student/payments`, label: 'Cuotas', icon: ReceiptIcon },
  ];

  const teacherItems: NavItem[] = [
    { href: `${base}/teacher`, label: 'Inicio', icon: HomeIcon },
    { href: `${base}/teacher/schedule`, label: 'Horario', icon: CalIcon },
    { href: `${base}/teacher/attendance`, label: 'Asistencia', icon: CheckIcon },
    { href: `${base}/teacher/grades`, label: 'Notas', icon: BookIcon },
  ];

  const items = isTeacher ? teacherItems : studentItems;

  return (
    <nav className="edu-bottom-nav">
      {items.map(item => {
        const isActive = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} className={`edu-bottom-nav-item ${isActive ? 'active' : ''}`}>
            {item.icon(isActive)}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
