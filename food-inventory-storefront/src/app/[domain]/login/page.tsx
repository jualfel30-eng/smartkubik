import { LoginPageClient } from './LoginPageClient';

export const dynamic = 'force-dynamic';

interface LoginPageProps {
  params: Promise<{ domain: string }>;
}

export default async function LoginPage({ params }: LoginPageProps) {
  const { domain } = await params;

  return <LoginPageClient domain={domain} />;
}
