import { RegisterPageClient } from './RegisterPageClient';

export const dynamic = 'force-dynamic';

interface RegisterPageProps {
  params: Promise<{ domain: string }>;
}

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { domain } = await params;

  return <RegisterPageClient domain={domain} />;
}
