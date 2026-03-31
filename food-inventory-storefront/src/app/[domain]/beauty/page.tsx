import { notFound } from 'next/navigation';
import { getStorefrontConfig } from '@/lib/api';
import { getBeautyServices, getProfessionals, getBeautyGallery, getBeautyReviews } from '@/lib/beautyApi';
import BeautyStorefront from '@/templates/BeautyStorefront';

interface BeautyPageProps {
  params: Promise<{ domain: string }>;
}

export default async function BeautyPage({ params }: BeautyPageProps) {
  const { domain } = await params;

  // Fetch storefront configuration using shared API function
  let config;
  try {
    config = await getStorefrontConfig(domain);
  } catch {
    notFound();
  }

  if (!config) {
    notFound();
  }

  // Check if beauty module is enabled
  const beautyConfig = (config as any).beautyConfig;
  if (!beautyConfig?.enabled) {
    notFound();
  }

  const tenantId = typeof config.tenantId === 'string' ? config.tenantId : config.tenantId._id;

  // Fetch all beauty data in parallel
  const [services, professionals, gallery, reviews] = await Promise.all([
    getBeautyServices(tenantId),
    getProfessionals(tenantId),
    getBeautyGallery(tenantId),
    getBeautyReviews(tenantId),
  ]);

  return (
    <BeautyStorefront
      config={config as any}
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
  let config;
  try {
    config = await getStorefrontConfig(domain);
  } catch {
    return { title: 'Beauty Services' };
  }

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
