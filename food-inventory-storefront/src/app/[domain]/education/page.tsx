import { notFound } from 'next/navigation';
import EducationPortal from '@/templates/EducationPortal/EducationPortal';
import type { EduPublicConfig } from '@/templates/EducationPortal/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ domain: string }>;
}

async function getEduConfig(domain: string): Promise<EduPublicConfig> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const res = await fetch(`${apiBase}/education/public/config/${domain}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Education config not found');
  return res.json();
}

export default async function EducationLandingPage({ params }: PageProps) {
  const { domain } = await params;

  let config: EduPublicConfig;
  try {
    config = await getEduConfig(domain);
  } catch {
    notFound();
  }

  return <EducationPortal config={config!} domain={domain} />;
}

export async function generateMetadata({ params }: PageProps) {
  const { domain } = await params;
  try {
    const config = await getEduConfig(domain);
    return {
      title: config.institutionName,
      description: config.tagline || `Portal institucional de ${config.institutionName}`,
    };
  } catch {
    return { title: 'Portal Educativo' };
  }
}
