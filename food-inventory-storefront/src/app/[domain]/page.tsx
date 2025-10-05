import { getStorefrontConfig, getActiveDomains } from '@/lib/api';
import { getTemplate } from '@/lib/templateFactory';

export const revalidate = 60; // ISR: Revalidar cada 60 segundos

interface StorefrontPageProps {
  params: Promise<{ domain: string }>;
}

export default async function StorefrontPage({
  params,
}: StorefrontPageProps) {
  const { domain } = await params;
  const config = await getStorefrontConfig(domain);
  const Template = getTemplate(config.template);

  return <Template config={config} />;
}

export async function generateStaticParams() {
  try {
    // Generar paths para todos los dominios activos
    const domains = await getActiveDomains();

    return domains.map((domain: string) => ({
      domain,
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    // Retornar array vacío si hay error
    return [];
  }
}
