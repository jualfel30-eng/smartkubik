import { notFound } from 'next/navigation';
import { getBeautyServices, getProfessionals, getBeautyGallery, getBeautyReviews } from '@/lib/beautyApi';
import BeautyStorefront from '@/templates/BeautyStorefront';

interface BeautyPageProps {
  params: Promise<{ domain: string }>;
}

async function getStorefrontConfig(domain: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/public/storefront-config?domain=${domain}`,
      { next: { revalidate: 60 } }
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching storefront config:', error);
    return null;
  }
}

export default async function BeautyPage({ params }: BeautyPageProps) {
  const { domain } = await params;

  // Fetch storefront configuration
  const config = await getStorefrontConfig(domain);

  if (!config) {
    notFound();
  }

  // Check if beauty module is enabled
  const beautyConfig = (config as any).beautyConfig;
  if (!beautyConfig?.enabled) {
    notFound();
  }

  const tenantId = config.tenantId;

  // Fetch all beauty data in parallel
  const [services, professionals, gallery, reviews] = await Promise.all([
    getBeautyServices(tenantId),
    getProfessionals(tenantId),
    getBeautyGallery(tenantId),
    getBeautyReviews(tenantId),
  ]);

  return (
    <BeautyStorefront
      config={config}
      services={services}
      professionals={professionals}
      gallery={gallery}
      reviews={reviews}
      domain={domain}
    />
  );
}

export async function generateMetadata({ params }: BeautyPageProps) {
  const { domain } = await params;
  const config = await getStorefrontConfig(domain);

  if (!config) {
    return {
      title: 'Beauty Services',
    };
  }

  const beautyConfig = (config as any).beautyConfig;
  const businessName = (config as any).name || 'Beauty Salon';

  return {
    title: `${businessName} - Beauty Services`,
    description: beautyConfig?.seoDescription || `Book your beauty appointment at ${businessName}. Professional services, experienced team, and premium care.`,
    keywords: beautyConfig?.seoKeywords || 'beauty salon, hair salon, spa, beauty services, appointments',
    openGraph: {
      title: `${businessName} - Beauty Services`,
      description: beautyConfig?.seoDescription || `Book your appointment today`,
      images: beautyConfig?.heroBanner ? [beautyConfig.heroBanner] : [],
    },
  };
}
