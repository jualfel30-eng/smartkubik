import { getStorefrontConfig } from '@/lib/api';
import ThemeProvider from '@/components/ThemeProvider';

interface DomainLayoutProps {
  children: React.ReactNode;
  params: Promise<{ domain: string }>;
}

export default async function DomainLayout({
  children,
  params,
}: DomainLayoutProps) {
  const { domain } = await params;
  const config = await getStorefrontConfig(domain);

  return (
    <ThemeProvider theme={config.theme}>
      {children}
    </ThemeProvider>
  );
}
