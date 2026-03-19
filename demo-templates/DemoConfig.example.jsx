/**
 * 🎯 SmartKubik Demo Configuration
 *
 * Este archivo muestra cómo usar las variables de entorno
 * en tu página demo para personalización dinámica.
 *
 * Úsalo en tus componentes React/Vue para acceder a la config de la demo
 */

// ===== CONFIG OBJECT =====
export const demoConfig = {
  // Demo Identity
  demoName: import.meta.env.VITE_DEMO_NAME || 'demo-page',
  businessType: import.meta.env.VITE_BUSINESS_TYPE || 'general',
  industry: import.meta.env.VITE_INDUSTRY || 'general',

  // Branding
  branding: {
    businessName: import.meta.env.VITE_BUSINESS_NAME || 'Mi Negocio',
    tagline: import.meta.env.VITE_BUSINESS_TAGLINE || '',
    primaryColor: import.meta.env.VITE_BRAND_PRIMARY_COLOR || '#3498db',
    secondaryColor: import.meta.env.VITE_BRAND_SECONDARY_COLOR || '#2c3e50',
    logo: import.meta.env.VITE_BRAND_LOGO_URL || '/logo.png',
    favicon: import.meta.env.VITE_BRAND_FAVICON || '/favicon.ico',
  },

  // Contact Information
  contact: {
    phone: import.meta.env.VITE_CONTACT_PHONE || '',
    email: import.meta.env.VITE_CONTACT_EMAIL || '',
    address: import.meta.env.VITE_CONTACT_ADDRESS || '',
    whatsapp: import.meta.env.VITE_CONTACT_WHATSAPP || '',
    social: {
      facebook: import.meta.env.VITE_CONTACT_SOCIAL_FACEBOOK || '',
      instagram: import.meta.env.VITE_CONTACT_SOCIAL_INSTAGRAM || '',
    },
  },

  // Call-to-Action
  cta: {
    primaryText: import.meta.env.VITE_CTA_PRIMARY_TEXT || 'Obtener SmartKubik',
    secondaryText: import.meta.env.VITE_CTA_SECONDARY_TEXT || 'Ver Demo',
    contactText: import.meta.env.VITE_CTA_CONTACT_TEXT || 'Contactar',
    pricingUrl: import.meta.env.VITE_CTA_PRICING_URL || 'https://smartkubik.com/pricing',
    contactUrl: import.meta.env.VITE_CTA_CONTACT_URL || 'https://smartkubik.com/contact',
  },

  // SmartKubik Upsell
  smartkubik: {
    pitch: import.meta.env.VITE_SMARTKUBIK_PITCH || '',
    features: import.meta.env.VITE_SMARTKUBIK_FEATURES?.split(',') || [],
    showBanner: import.meta.env.VITE_SHOW_SMARTKUBIK_BANNER === 'true',
    discountCode: import.meta.env.VITE_SMARTKUBIK_DISCOUNT_CODE || '',
    tenantSlug: import.meta.env.VITE_SMARTKUBIK_TENANT_SLUG || '',
    apiEndpoint: import.meta.env.VITE_SMARTKUBIK_API_ENDPOINT || 'https://api.smartkubik.com',
  },

  // Analytics
  analytics: {
    gaId: import.meta.env.VITE_GA_MEASUREMENT_ID || '',
    fbPixelId: import.meta.env.VITE_FB_PIXEL_ID || '',
    hotjarId: import.meta.env.VITE_HOTJAR_ID || '',
    trackingId: import.meta.env.VITE_DEMO_TRACKING_ID || '',
  },

  // Feature Flags
  features: {
    chatWidget: import.meta.env.VITE_ENABLE_CHAT_WIDGET === 'true',
    bookingForm: import.meta.env.VITE_ENABLE_BOOKING_FORM === 'true',
    menuShowcase: import.meta.env.VITE_ENABLE_MENU_SHOWCASE === 'true',
    testimonials: import.meta.env.VITE_ENABLE_TESTIMONIALS === 'true',
    gallery: import.meta.env.VITE_ENABLE_GALLERY === 'true',
  },

  // Promo/Offer
  promo: {
    enabled: import.meta.env.VITE_PROMO_BANNER_ENABLED === 'true',
    bannerText: import.meta.env.VITE_PROMO_BANNER_TEXT || '',
    urgencyText: import.meta.env.VITE_PROMO_URGENCY_TEXT || '',
    originalPrice: Number(import.meta.env.VITE_PROMO_ORIGINAL_PRICE) || 0,
    discountedPrice: Number(import.meta.env.VITE_PROMO_DISCOUNTED_PRICE) || 0,
    currency: import.meta.env.VITE_PROMO_CURRENCY || 'USD',
  },

  // Hero Content
  hero: {
    title: import.meta.env.VITE_HERO_TITLE || '',
    subtitle: import.meta.env.VITE_HERO_SUBTITLE || '',
    image: import.meta.env.VITE_HERO_IMAGE || '',
  },

  // Metadata
  metadata: {
    version: import.meta.env.VITE_DEMO_VERSION || '1.0',
    createdDate: import.meta.env.VITE_DEMO_CREATED_DATE || '',
    expiryDate: import.meta.env.VITE_DEMO_EXPIRY_DATE || '',
  },
};

// ===== UTILITY FUNCTIONS =====

/**
 * Track demo interaction
 */
export const trackDemoEvent = (eventName, eventData = {}) => {
  if (window.gtag && demoConfig.analytics.gaId) {
    window.gtag('event', eventName, {
      demo_name: demoConfig.demoName,
      demo_tracking_id: demoConfig.analytics.trackingId,
      ...eventData,
    });
  }

  // Log para desarrollo
  if (import.meta.env.DEV) {
    console.log('📊 Demo Event:', eventName, eventData);
  }
};

/**
 * Check if demo is expired
 */
export const isDemoExpired = () => {
  if (!demoConfig.metadata.expiryDate) return false;

  const expiryDate = new Date(demoConfig.metadata.expiryDate);
  const now = new Date();

  return now > expiryDate;
};

/**
 * Get SmartKubik integration URL
 */
export const getSmartKubikUrl = (page = '') => {
  const { tenantSlug, apiEndpoint } = demoConfig.smartkubik;

  if (!tenantSlug) {
    return 'https://smartkubik.com/contact';
  }

  return `https://${tenantSlug}.smartkubik.com${page}`;
};

/**
 * Format price with currency
 */
export const formatPrice = (price) => {
  const { currency } = demoConfig.promo;

  const formatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency || 'USD',
  });

  return formatter.format(price);
};

/**
 * Open WhatsApp chat
 */
export const openWhatsApp = (message = '') => {
  const { whatsapp } = demoConfig.contact;

  if (!whatsapp) return;

  const encodedMessage = encodeURIComponent(
    message || `Hola! Estoy interesado en ${demoConfig.branding.businessName}`
  );

  const url = `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodedMessage}`;

  window.open(url, '_blank');

  trackDemoEvent('whatsapp_click', { message });
};

// ===== EXAMPLE USAGE IN COMPONENTS =====

/*

// === Hero Component Example ===
import { demoConfig } from './DemoConfig';

function HeroSection() {
  return (
    <div className="hero" style={{
      backgroundImage: `url(${demoConfig.hero.image})`
    }}>
      <h1>{demoConfig.hero.title}</h1>
      <p>{demoConfig.hero.subtitle}</p>
    </div>
  );
}

// === CTA Button Example ===
import { demoConfig, trackDemoEvent } from './DemoConfig';

function CTAButton() {
  const handleClick = () => {
    trackDemoEvent('cta_primary_click');
    window.location.href = demoConfig.cta.contactUrl;
  };

  return (
    <button
      onClick={handleClick}
      style={{ backgroundColor: demoConfig.branding.primaryColor }}
    >
      {demoConfig.cta.primaryText}
    </button>
  );
}

// === SmartKubik Upsell Banner ===
import { demoConfig, trackDemoEvent, getSmartKubikUrl } from './DemoConfig';

function SmartKubikBanner() {
  if (!demoConfig.smartkubik.showBanner) return null;

  const handleLearnMore = () => {
    trackDemoEvent('smartkubik_banner_click');
    window.location.href = getSmartKubikUrl('/pricing');
  };

  return (
    <div className="smartkubik-banner">
      <h3>🚀 {demoConfig.smartkubik.pitch}</h3>
      <ul>
        {demoConfig.smartkubik.features.map(feature => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <button onClick={handleLearnMore}>
        Integrar con SmartKubik
      </button>
      {demoConfig.smartkubik.discountCode && (
        <span className="discount-code">
          Código: {demoConfig.smartkubik.discountCode}
        </span>
      )}
    </div>
  );
}

// === Promo Banner Example ===
import { demoConfig, formatPrice } from './DemoConfig';

function PromoBanner() {
  if (!demoConfig.promo.enabled) return null;

  return (
    <div className="promo-banner">
      <p>{demoConfig.promo.bannerText}</p>
      <div className="pricing">
        <span className="original-price">
          {formatPrice(demoConfig.promo.originalPrice)}
        </span>
        <span className="discounted-price">
          {formatPrice(demoConfig.promo.discountedPrice)}
        </span>
      </div>
      <span className="urgency">{demoConfig.promo.urgencyText}</span>
    </div>
  );
}

// === Contact Section Example ===
import { demoConfig, openWhatsApp, trackDemoEvent } from './DemoConfig';

function ContactSection() {
  return (
    <div className="contact">
      <h2>Contáctanos</h2>
      <p>{demoConfig.contact.address}</p>
      <a href={`tel:${demoConfig.contact.phone}`}>
        {demoConfig.contact.phone}
      </a>
      <a href={`mailto:${demoConfig.contact.email}`}>
        {demoConfig.contact.email}
      </a>
      <button
        onClick={() => {
          openWhatsApp('Hola! Quiero más información sobre SmartKubik');
        }}
      >
        Chat en WhatsApp
      </button>
      <div className="social">
        <a href={demoConfig.contact.social.facebook} target="_blank">
          Facebook
        </a>
        <a href={demoConfig.contact.social.instagram} target="_blank">
          Instagram
        </a>
      </div>
    </div>
  );
}

// === Feature Flag Example ===
import { demoConfig } from './DemoConfig';

function App() {
  return (
    <>
      <HeroSection />
      {demoConfig.features.menuShowcase && <MenuSection />}
      {demoConfig.features.testimonials && <TestimonialsSection />}
      {demoConfig.features.gallery && <GallerySection />}
      {demoConfig.features.bookingForm && <BookingForm />}
      {demoConfig.features.chatWidget && <ChatWidget />}
    </>
  );
}

*/

export default demoConfig;
