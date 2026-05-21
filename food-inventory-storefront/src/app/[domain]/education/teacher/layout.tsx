'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useEducationAuth } from '@/contexts/EducationAuthContext';
import EduSidebar from '@/templates/EducationPortal/components/EduSidebar';
import EduBottomNav from '@/templates/EducationPortal/components/EduBottomNav';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isTeacher, user } = useEducationAuth();
  const router = useRouter();
  const params = useParams<{ domain: string }>();
  const domain = params.domain;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/${domain}/education/login?type=teacher`);
    } else if (!isTeacher) {
      router.push(`/${domain}/education/login`);
    }
  }, [isAuthenticated, isTeacher, router, domain]);

  if (!isAuthenticated || !isTeacher) return null;

  return (
    <div className="edu-portal-layout">
      <EduSidebar domain={domain} institutionName={user?.name || ''} />
      <main className="edu-portal-main">
        {children}
      </main>
      <EduBottomNav domain={domain} />
    </div>
  );
}
