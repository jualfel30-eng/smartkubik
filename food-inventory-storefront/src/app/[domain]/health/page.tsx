import { notFound } from 'next/navigation';
import { getStorefrontConfig } from '@/lib/api';
import {
  getBeautyServices,
  getProfessionals,
  getBeautyGallery,
  getBeautyReviews,
  getGooglePlacesData,
} from '@/lib/beautyApi';
import HealthStorefront from '@/templates/HealthStorefront';

interface HealthPageProps {
  params: Promise<{ domain: string }>;
}

export default async function HealthPage({ params }: HealthPageProps) {
  const { domain } = await params;

  let config;
  try {
    config = await getStorefrontConfig(domain);
  } catch {
    notFound();
  }
  if (!config) {
    notFound();
  }

  const cfg = config as any;
  if (cfg.templateType !== 'health') {
    notFound();
  }

  const tenantId = typeof cfg.tenantId === 'object' ? cfg.tenantId._id : cfg.tenantId;
  const googlePlaceId: string | undefined = cfg.googlePlaceId || undefined;

  const [services, professionals, gallery, reviews, googlePlacesData] = await Promise.all([
    getBeautyServices(tenantId),
    getProfessionals(tenantId),
    getBeautyGallery(tenantId),
    getBeautyReviews(tenantId),
    googlePlaceId ? getGooglePlacesData(googlePlaceId) : Promise.resolve(null),
  ]);

  const healthConfig = {
    tenantId,
    name: cfg.tenantId?.name || cfg.seo?.title || 'Clínica',
    description: cfg.seo?.description || '',
    logoUrl: cfg.theme?.logo,
    bannerUrl: cfg.theme?.bannerUrl,
    contactInfo: {
      email: cfg.contactInfo?.email || '',
      phone: cfg.contactInfo?.phone || '',
      whatsapp: cfg.socialMedia?.whatsapp || cfg.contactInfo?.phone || '',
      address:
        typeof cfg.contactInfo?.address === 'object'
          ? `${cfg.contactInfo.address.street || ''}, ${cfg.contactInfo.address.city || ''}`
          : cfg.contactInfo?.address || '',
      city: typeof cfg.contactInfo?.address === 'object' ? cfg.contactInfo.address.city : undefined,
      country: typeof cfg.contactInfo?.address === 'object' ? cfg.contactInfo.address.country : undefined,
      socialMedia: {
        instagram: cfg.socialMedia?.instagram,
        facebook: cfg.socialMedia?.facebook,
      },
    },
    businessHours: cfg.beautyConfig?.businessHours || [],
    paymentMethods: cfg.beautyConfig?.paymentMethods || [],
  };

  return (
    <HealthStorefront
      config={healthConfig}
      services={services}
      professionals={professionals}
      gallery={gallery}
      reviews={reviews}
      googlePlaceId={googlePlaceId}
      googlePlacesData={googlePlacesData}
      domain={domain}
    />
  );
}

export async function generateMetadata({ params }: HealthPageProps) {
  const { domain } = await params;
  let config;
  try {
    config = await getStorefrontConfig(domain);
  } catch {
    return { title: 'Salud' };
  }
  if (!config) {
    return { title: 'Salud' };
  }

  const cfg = config as any;
  const tenantName = typeof cfg.tenantId === 'object' ? cfg.tenantId.name : null;
  const businessName = tenantName || cfg.seo?.title || 'Clínica';

  return {
    title: `${businessName} - Salud`,
    description:
      cfg.seo?.description ||
      `Agenda tu cita en ${businessName}. Atención profesional, equipo especializado y reserva en línea.`,
    keywords: cfg.seo?.keywords || ['clínica', 'salud', 'citas', 'odontología', 'estética médica'],
    openGraph: {
      title: `${businessName} - Salud`,
      description: cfg.seo?.description || 'Agenda tu cita hoy',
      images: cfg.theme?.logo ? [cfg.theme.logo] : [],
    },
  };
}
