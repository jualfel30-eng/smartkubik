import { ProfilePageClient } from './ProfilePageClient';

export const dynamic = 'force-dynamic';

interface ProfilePageProps {
  params: Promise<{ domain: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { domain } = await params;

  return <ProfilePageClient domain={domain} />;
}
