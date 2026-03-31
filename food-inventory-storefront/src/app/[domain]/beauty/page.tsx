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

  // Check if this storefront uses the beauty template
  const cfg = config as any;
  if (cfg.templateType !== 'beauty') {
    notFound();
  }

  const tenantId = typeof cfg.tenantId === 'object' ? cfg.tenantId._id : cfg.tenantId;

  // Fetch all beauty data in parallel
  const [services, professionals, gallery, reviews] = await Promise.all([
    getBeautyServices(tenantId),
    getProfessionals(tenantId),
    getBeautyGallery(tenantId),
    getBeautyReviews(tenantId),
  ]);

  // Map API response to BeautyStorefront expected config shape
  const beautyConfig = {
    tenantId,
    name: cfg.tenantId?.name || cfg.seo?.title || 'Beauty Salon',
    description: cfg.seo?.description || '',
    logoUrl: cfg.theme?.logo,
    bannerUrl: cfg.theme?.bannerUrl,
    videoUrl: cfg.theme?.videoUrl,
    primaryColor: cfg.theme?.primaryColor,
    secondaryColor: cfg.theme?.secondaryColor,
    contactInfo: {
      email: cfg.contactInfo?.email || '',
      phone: cfg.contactInfo?.phone || '',
      whatsapp: cfg.socialMedia?.whatsapp || cfg.contactInfo?.phone || '',
      address: typeof cfg.contactInfo?.address === 'object'
        ? `${cfg.contactInfo.address.street || ''}, ${cfg.contactInfo.address.city || ''}`
        : cfg.contactInfo?.address || '',
      city: typeof cfg.contactInfo?.address === 'object' ? cfg.contactInfo.address.city : undefined,
      country: typeof cfg.contactInfo?.address === 'object' ? cfg.contactInfo.address.country : undefined,
      socialMedia: {
        instagram: cfg.socialMedia?.instagram,
        facebook: cfg.socialMedia?.facebook,
      },
    },
  };

  return (
    <BeautyStorefront
      config={beautyConfig}
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

  const tenantName = typeof (config as any).tenantId === 'object'
    ? (config as any).tenantId.name
    : null;
  const businessName = tenantName || (config as any).seo?.title || 'Beauty Salon';

  return {
    title: `${businessName} - Beauty Services`,
    description: (config as any).seo?.description || `Book your beauty appointment at ${businessName}. Professional services, experienced team, and premium care.`,
    keywords: (config as any).seo?.keywords || ['beauty salon', 'hair salon', 'spa', 'beauty services', 'appointments'],
    openGraph: {
      title: `${businessName} - Beauty Services`,
      description: (config as any).seo?.description || `Book your appointment today`,
      images: (config as any).theme?.logo ? [(config as any).theme.logo] : [],
    },
  };
}
