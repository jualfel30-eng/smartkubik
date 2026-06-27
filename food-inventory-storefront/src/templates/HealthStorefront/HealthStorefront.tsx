'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  submitLead,
  type BeautyService,
  type Professional,
  type GalleryItem,
  type Review,
  type GooglePlacesData,
} from '@/lib/beautyApi';
import BeforeAfterSlider from '@/templates/BeautyStorefront/components/BeforeAfterSlider';
import './health.css';

export interface HealthConfig {
  tenantId: string;
  name: string;
  description: string;
  logoUrl?: string;
  bannerUrl?: string;
  contactInfo: {
    email: string;
    phone: string;
    whatsapp?: string;
    address: string;
    city?: string;
    country?: string;
    socialMedia?: {
      instagram?: string;
      facebook?: string;
    };
  };
  businessHours?: Array<{ day: number; dayName: string; isOpen: boolean; open: string; close: string }>;
  paymentMethods?: Array<{ name: string; isActive: boolean; details?: string }>;
}

interface HealthStorefrontProps {
  config: HealthConfig;
  services: BeautyService[];
  professionals: Professional[];
  gallery?: GalleryItem[];
  reviews?: Review[];
  googlePlaceId?: string;
  googlePlacesData?: GooglePlacesData | null;
  domain?: string;
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const HERO_FALLBACK =
  'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1920&q=80';
const SERVICE_FALLBACK =
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80';

function formatPrice(amount: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('es', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function StarRow({ rating, size = 'sm', center = false }: { rating: number; size?: 'sm' | 'lg'; center?: boolean }) {
  const px = size === 'lg' ? 'h-6 w-6' : 'h-4 w-4';
  return (
    <div className={`flex gap-0.5 ${center ? 'justify-center' : ''}`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={px} fill={rating >= s ? '#C9A96E' : '#E5E0D8'} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

const NAV_LINKS = [
  { label: 'Servicios', href: '#servicios' },
  { label: 'Equipo', href: '#equipo' },
  { label: 'Resultados', href: '#resultados' },
  { label: 'Contacto', href: '#contacto' },
];

export default function HealthStorefront({
  config,
  services,
  professionals,
  gallery = [],
  reviews = [],
  googlePlaceId,
  googlePlacesData,
  domain,
}: HealthStorefrontProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lead, setLead] = useState({ name: '', phone: '', email: '', serviceInterest: '', message: '' });
  const [leadStatus, setLeadStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [reviewTab, setReviewTab] = useState<'inapp' | 'google'>(reviews.length > 0 ? 'inapp' : 'google');

  const reserveHref = `/${domain}/health/reservar`;

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadStatus('sending');
    try {
      await submitLead({
        tenantId: config.tenantId,
        name: lead.name,
        phone: lead.phone,
        email: lead.email || undefined,
        serviceInterest: lead.serviceInterest || undefined,
        message: lead.message || undefined,
      });
      setLeadStatus('sent');
      setLead({ name: '', phone: '', email: '', serviceInterest: '', message: '' });
    } catch {
      setLeadStatus('error');
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const whatsapp = config.contactInfo.whatsapp || config.contactInfo.phone;
  const whatsappHref = whatsapp
    ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`
    : reserveHref;

  // Google Maps embed: funciona solo con la dirección (sin API key).
  const mapQuery = encodeURIComponent(
    [config.contactInfo.address, config.contactInfo.city, config.contactInfo.country]
      .filter(Boolean)
      .join(', '),
  );
  const mapSrc = googlePlaceId
    ? `https://maps.google.com/maps?q=place_id:${googlePlaceId}&output=embed&hl=es`
    : `https://maps.google.com/maps?q=${mapQuery}&output=embed&hl=es`;
  const googleMapsLink = googlePlaceId
    ? `https://www.google.com/maps/place/?q=place_id:${googlePlaceId}`
    : `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  const businessHours = config.businessHours || [];
  const googleReviews = googlePlacesData?.reviews || [];

  // Rating combinado (in-app + Google), igual que el storefront de beauty
  const hasInApp = reviews.length > 0;
  const hasGoogle = !!(googlePlacesData && (googlePlacesData.reviews?.length ?? 0) > 0);
  const reviewTabs: Array<'inapp' | 'google'> = [];
  if (hasInApp) reviewTabs.push('inapp');
  if (hasGoogle) reviewTabs.push('google');
  const inAppAvg = hasInApp ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const googleAvg = googlePlacesData?.rating ?? 0;
  const googleCount = googlePlacesData?.user_ratings_total ?? 0;
  const reviewTotal = reviews.length + googleCount;
  const combinedAvg = reviewTotal > 0 ? (inAppAvg * reviews.length + googleAvg * googleCount) / reviewTotal : 0;
  const activeReviewTab = reviewTabs.includes(reviewTab) ? reviewTab : reviewTabs[0] || 'inapp';

  return (
    <div className="health-root min-h-screen">
      {/* ===== Navbar ===== */}
      <header
        className={`fixed top-0 left-0 z-50 w-full transition-all duration-500 ${
          scrolled ? 'glass-nav' : 'bg-transparent'
        }`}
      >
        <nav className="relative mx-auto flex h-24 max-w-7xl items-center justify-between px-6 md:px-12 lg:px-16">
          <a
            href="#top"
            className="font-display text-xl tracking-[0.2em] text-[#0A0A0A] transition-opacity duration-300 hover:opacity-70 md:text-2xl"
          >
            {config.name}
          </a>

          <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-10 lg:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="label-caps text-[11px] text-[#6B6B6B] transition-colors duration-300 hover:text-[#C9A96E]"
              >
                {link.label}
              </a>
            ))}
          </div>

          <a href={reserveHref} className="btn-primary hidden px-8 py-3.5 text-[10px] lg:inline-flex">
            Reservar Cita
          </a>

          <button
            onClick={() => setMobileOpen(true)}
            className="flex flex-col gap-[5px] p-2 lg:hidden"
            aria-label="Menu"
          >
            <span className="h-[1px] w-6 bg-[#0A0A0A]" />
            <span className="h-[1px] w-6 bg-[#0A0A0A]" />
            <span className="h-[1px] w-4 bg-[#0A0A0A]" />
          </button>
        </nav>
      </header>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0A0A0A]"
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-8 right-8 p-2 text-[#F7F3EE] transition-opacity duration-300 hover:opacity-60"
              aria-label="Cerrar"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
              </svg>
            </button>

            <nav className="flex flex-col items-center gap-10">
              {NAV_LINKS.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="font-display text-[clamp(1.8rem,5vw,2.5rem)] font-light tracking-wide text-[#F7F3EE] transition-colors duration-300 hover:text-[#C9A96E]"
                >
                  {link.label}
                </motion.a>
              ))}
              <motion.a
                href={reserveHref}
                onClick={() => setMobileOpen(false)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="btn-primary mt-6 bg-[#C9A96E] hover:bg-[#B8944F]"
              >
                Reservar Cita
              </motion.a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Hero ===== */}
      <section id="top" className="relative h-screen w-full overflow-hidden">
        <div className="absolute inset-0 animate-kenburns">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={config.bannerUrl || HERO_FALLBACK}
            alt={config.name}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-[#F7F3EE]/65" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-8 text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="label-caps mb-8 text-[11px] tracking-[0.25em] text-[#6B6B6B]"
          >
            {config.name}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="font-display text-[clamp(2.8rem,7vw,5.5rem)] font-light leading-[1.05] text-[#0A0A0A]"
          >
            Tu salud, <span className="italic">con precisión y cuidado.</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="mt-8 h-px w-16 bg-[#C9A96E]/50"
          />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-8 max-w-lg text-[clamp(1rem,2vw,1.2rem)] font-light leading-relaxed text-[#6B6B6B]"
          >
            {config.description ||
              'Atención profesional en un entorno de confianza. Agenda tu cita en línea.'}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="mt-14 flex flex-col gap-4 sm:flex-row sm:gap-5"
          >
            <a href={reserveHref} className="btn-primary px-10">
              Reservar Cita
            </a>
            <a href="#servicios" className="btn-ghost px-10">
              Ver Servicios
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <div className="animate-scroll-bounce flex flex-col items-center gap-2">
            <span className="label-caps text-[9px] text-[#6B6B6B]/50">Scroll</span>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-[#6B6B6B]/40">
              <path d="M9 4v10m0 0l-3.5-3.5M9 14l3.5-3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </motion.div>
      </section>

      {/* ===== Services ===== */}
      <section id="servicios" className="bg-[#FAFAF8] px-6 py-28 md:px-12 md:py-36 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="mb-20 text-center"
          >
            <p className="label-caps mb-5 text-[11px] text-[#C9A96E]">Nuestros Tratamientos</p>
            <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] font-light text-[#0A0A0A]">
              Servicios
            </h2>
            <div className="mx-auto mt-5 h-px w-12 bg-[#C9A96E]/40" />
            <p className="mx-auto mt-8 max-w-xl text-[15px] font-light leading-relaxed text-[#6B6B6B]">
              Atención especializada con profesionales certificados y la más alta tecnología.
            </p>
          </motion.div>

          {services.length === 0 ? (
            <p className="text-center text-[15px] font-light text-[#6B6B6B]">
              Pronto publicaremos nuestros servicios.
            </p>
          ) : (
            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service, i) => (
                <motion.a
                  key={service._id}
                  href={`/${domain}/health/servicios/${service._id}`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.6, delay: Math.min(i, 5) * 0.1 }}
                  className="group block overflow-hidden border border-[#E5E0D8] bg-white transition-all duration-500 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={service.images?.[0] || SERVICE_FALLBACK}
                      alt={service.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-8">
                    <p className="label-caps mb-3 text-[10px] text-[#C9A96E]">{service.category}</p>
                    <h3 className="font-display text-[22px] font-normal text-[#0A0A0A]">{service.name}</h3>
                    <p className="mt-3 line-clamp-2 text-[14px] font-light leading-relaxed text-[#6B6B6B]">
                      {service.description}
                    </p>
                    <div className="mt-6 flex items-center justify-between border-t border-[#E5E0D8] pt-6">
                      <span className="font-display text-lg text-[#0A0A0A]">
                        {formatPrice(service.price.amount, service.price.currency)}
                      </span>
                      <span className="label-caps text-[10px] text-[#C9A96E] transition-all duration-300 group-hover:tracking-[0.2em]">
                        Ver detalle →
                      </span>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== Team / Doctors ===== */}
      {professionals.length > 0 && (
        <section id="equipo" className="bg-[#F7F3EE] px-6 py-28 md:px-12 md:py-36 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.7 }}
              className="mb-20 text-center"
            >
              <p className="label-caps mb-5 text-[11px] text-[#C9A96E]">Nuestro Equipo</p>
              <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] font-light text-[#0A0A0A]">
                Especialistas
              </h2>
              <div className="mx-auto mt-5 h-px w-12 bg-[#C9A96E]/40" />
            </motion.div>

            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {professionals.map((pro, i) => (
                <motion.div
                  key={pro._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.6, delay: Math.min(i, 5) * 0.1 }}
                  className="text-center"
                >
                  <div className="relative mx-auto aspect-square w-full max-w-[260px] overflow-hidden rounded-full border border-[#E5E0D8] bg-white">
                    {pro.avatar || pro.images?.[0] ? (
                      <Image
                        src={(pro.avatar || pro.images?.[0]) as string}
                        alt={pro.name}
                        fill
                        sizes="260px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-display text-5xl text-[#C9A96E]">
                        {pro.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h3 className="mt-6 font-display text-[22px] font-normal text-[#0A0A0A]">{pro.name}</h3>
                  {pro.role && <p className="label-caps mt-2 text-[10px] text-[#C9A96E]">{pro.role}</p>}
                  {pro.specialties?.length > 0 && (
                    <p className="mt-3 text-[13px] font-light text-[#6B6B6B]">
                      {pro.specialties.join(' · ')}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== Gallery / Resultados (antes y después) ===== */}
      {gallery.length > 0 && (
        <section id="resultados" className="bg-[#FAFAF8] px-6 py-28 md:px-12 md:py-36 lg:px-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 text-center">
              <p className="label-caps mb-4 text-[11px] text-[#C9A96E]">Resultados</p>
              <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] font-light text-[#0A0A0A]">Antes y Después</h2>
              <div className="mx-auto mt-5 h-px w-12 bg-[#C9A96E]/40" />
              <p className="mx-auto mt-8 max-w-xl text-[15px] font-light leading-relaxed text-[#6B6B6B]">
                Resultados reales de nuestros pacientes.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              {gallery.map((item) => (
                <div key={item._id}>
                  {item.beforeImage ? (
                    <BeforeAfterSlider beforeImage={item.beforeImage} afterImage={item.image} alt={item.caption || 'Resultado'} />
                  ) : (
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image src={item.image} alt={item.caption || 'Resultado'} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
                    </div>
                  )}
                  {item.caption && <p className="mt-3 text-center text-sm font-light text-[#6B6B6B]">{item.caption}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== Testimonios (in-app + Google, igual que beauty) ===== */}
      {reviewTabs.length > 0 && (
        <section id="testimonios" className="bg-[#F7F3EE] px-6 py-28 md:px-12 md:py-36 lg:px-16">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <p className="label-caps mb-4 text-[11px] text-[#C9A96E]">Testimonios</p>
              <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] font-light text-[#0A0A0A]">Lo que dicen nuestros pacientes</h2>
              <div className="mx-auto mt-5 h-px w-12 bg-[#C9A96E]/40" />

              {/* Rating combinado */}
              <div className="mt-8 flex items-center justify-center gap-3">
                <span className="font-display text-5xl font-light text-[#C9A96E]">{combinedAvg.toFixed(1)}</span>
                <div className="text-left">
                  <StarRow rating={Math.round(combinedAvg)} size="lg" />
                  <p className="mt-1 text-sm font-light text-[#6B6B6B]">
                    Basado en {reviewTotal.toLocaleString()} reseña{reviewTotal !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Pestañas — solo si existen ambas fuentes */}
              {reviewTabs.length > 1 && (
                <div className="mt-8 flex justify-center gap-3">
                  <button
                    onClick={() => setReviewTab('inapp')}
                    className="border px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] transition-colors"
                    style={
                      activeReviewTab === 'inapp'
                        ? { backgroundColor: '#0A0A0A', color: '#fff', borderColor: '#0A0A0A' }
                        : { backgroundColor: 'transparent', color: '#6B6B6B', borderColor: '#E5E0D8' }
                    }
                  >
                    Nuestros pacientes ({reviews.length})
                  </button>
                  <button
                    onClick={() => setReviewTab('google')}
                    className="flex items-center gap-2 border px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] transition-colors"
                    style={
                      activeReviewTab === 'google'
                        ? { backgroundColor: '#0A0A0A', color: '#fff', borderColor: '#0A0A0A' }
                        : { backgroundColor: 'transparent', color: '#6B6B6B', borderColor: '#E5E0D8' }
                    }
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path fill={activeReviewTab === 'google' ? '#fff' : '#4285F4'} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill={activeReviewTab === 'google' ? '#fff' : '#34A853'} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill={activeReviewTab === 'google' ? '#fff' : '#FBBC05'} d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill={activeReviewTab === 'google' ? '#fff' : '#EA4335'} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google ({googleCount.toLocaleString()})
                  </button>
                </div>
              )}
            </div>

            {/* In-app */}
            {activeReviewTab === 'inapp' && hasInApp && (
              <div className="grid gap-8 md:grid-cols-3">
                {reviews.slice(0, 6).map((r, i) => (
                  <div key={i} className="border border-[#E5E0D8] bg-white p-8 text-left">
                    <StarRow rating={r.rating} />
                    <p className="mt-4 text-[15px] font-light italic leading-relaxed text-[#6B6B6B]">“{r.comment}”</p>
                    <p className="mt-5 font-display text-lg text-[#0A0A0A]">{r.clientName || 'Paciente'}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Google */}
            {activeReviewTab === 'google' && hasGoogle && (
              <div className="grid gap-8 md:grid-cols-3">
                {googleReviews.slice(0, 6).map((g, i) => (
                  <div key={i} className="border border-[#E5E0D8] bg-white p-8 text-left">
                    <div className="flex items-center justify-between">
                      <StarRow rating={g.rating} />
                      <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                    </div>
                    <p className="mt-4 line-clamp-5 text-[15px] font-light italic leading-relaxed text-[#6B6B6B]">“{g.text}”</p>
                    <p className="mt-5 font-display text-lg text-[#0A0A0A]">{g.author_name}</p>
                    {g.relative_time_description && (
                      <p className="mt-1 text-xs font-light text-[#A8A29A]">{g.relative_time_description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===== Ubicación (dirección + WhatsApp + Google Maps) ===== */}
      <section id="ubicacion" className="bg-[#FAFAF8] px-6 py-28 md:px-12 md:py-36 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <p className="label-caps mb-4 text-[11px] text-[#C9A96E]">Ubicación</p>
            <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] font-light text-[#0A0A0A]">Encuéntranos</h2>
            <div className="mx-auto mt-5 h-px w-12 bg-[#C9A96E]/40" />
          </div>
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="space-y-6">
              {config.contactInfo.address && (
                <div className="border border-[#E5E0D8] bg-white p-7">
                  <p className="label-caps mb-2 text-[10px] text-[#C9A96E]">Dirección</p>
                  <p className="text-[15px] font-light text-[#0A0A0A]">{config.contactInfo.address}</p>
                  {config.contactInfo.city && (
                    <p className="text-[15px] font-light text-[#6B6B6B]">
                      {config.contactInfo.city}{config.contactInfo.country ? `, ${config.contactInfo.country}` : ''}
                    </p>
                  )}
                  <a href={googleMapsLink} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-medium text-[#C9A96E] hover:underline">
                    Ver en Google Maps →
                  </a>
                </div>
              )}
              <div className="border border-[#E5E0D8] bg-white p-7">
                <p className="label-caps mb-2 text-[10px] text-[#C9A96E]">Contacto</p>
                {config.contactInfo.phone && (
                  <a href={`tel:${config.contactInfo.phone}`} className="block text-[15px] font-light text-[#0A0A0A] hover:underline">
                    {config.contactInfo.phone}
                  </a>
                )}
                {whatsapp && (
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-md bg-green-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-green-600">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                    WhatsApp
                  </a>
                )}
              </div>
              {businessHours.length > 0 && (
                <div className="border border-[#E5E0D8] bg-white p-7">
                  <p className="label-caps mb-3 text-[10px] text-[#C9A96E]">Horario</p>
                  <div className="space-y-1.5">
                    {[...businessHours].sort((a, b) => a.day - b.day).map((h) => (
                      <div key={h.day} className="flex justify-between text-sm font-light">
                        <span className="text-[#0A0A0A]">{DAYS[h.day]}</span>
                        <span className="text-[#6B6B6B]">{h.isOpen ? `${h.open} - ${h.close}` : 'Cerrado'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="min-h-[320px] overflow-hidden border border-[#E5E0D8]">
              <iframe
                title="Ubicación en Google Maps"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: 320 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={mapSrc}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== Contact ===== */}
      <section id="contacto" className="bg-[#F7F3EE] px-6 py-28 md:px-12 md:py-36 lg:px-16">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
          >
            <p className="label-caps mb-5 text-[11px] text-[#C9A96E]">Contacto</p>
            <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] font-light text-[#0A0A0A]">
              Agenda tu cita
            </h2>
            <div className="mx-auto mt-5 h-px w-12 bg-[#C9A96E]/40" />

            <div className="mt-10 space-y-2 text-[15px] font-light text-[#6B6B6B]">
              {config.contactInfo.address && <p>{config.contactInfo.address}</p>}
              {config.contactInfo.phone && <p>{config.contactInfo.phone}</p>}
              {config.contactInfo.email && <p>{config.contactInfo.email}</p>}
            </div>

            {/* Lead form → CRM */}
            <form onSubmit={handleLeadSubmit} className="mt-14 space-y-6 text-left">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="label-caps mb-2 block text-[10px] text-[#6B6B6B]">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={lead.name}
                    onChange={(e) => setLead({ ...lead, name: e.target.value })}
                    placeholder="Tu nombre"
                    className="w-full border-b border-[#E5E0D8] bg-transparent py-3 text-sm font-light text-[#0A0A0A] outline-none transition-colors placeholder:text-[#A8A29A] focus:border-[#C9A96E]"
                  />
                </div>
                <div>
                  <label className="label-caps mb-2 block text-[10px] text-[#6B6B6B]">Teléfono *</label>
                  <input
                    type="tel"
                    required
                    value={lead.phone}
                    onChange={(e) => setLead({ ...lead, phone: e.target.value })}
                    placeholder="+58 412 1234567"
                    className="w-full border-b border-[#E5E0D8] bg-transparent py-3 text-sm font-light text-[#0A0A0A] outline-none transition-colors placeholder:text-[#A8A29A] focus:border-[#C9A96E]"
                  />
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="label-caps mb-2 block text-[10px] text-[#6B6B6B]">Email</label>
                  <input
                    type="email"
                    value={lead.email}
                    onChange={(e) => setLead({ ...lead, email: e.target.value })}
                    placeholder="tu@email.com"
                    className="w-full border-b border-[#E5E0D8] bg-transparent py-3 text-sm font-light text-[#0A0A0A] outline-none transition-colors placeholder:text-[#A8A29A] focus:border-[#C9A96E]"
                  />
                </div>
                <div>
                  <label className="label-caps mb-2 block text-[10px] text-[#6B6B6B]">Servicio de interés</label>
                  <select
                    value={lead.serviceInterest}
                    onChange={(e) => setLead({ ...lead, serviceInterest: e.target.value })}
                    className="w-full border-b border-[#E5E0D8] bg-transparent py-3 text-sm font-light text-[#0A0A0A] outline-none transition-colors focus:border-[#C9A96E]"
                  >
                    <option value="">Seleccionar...</option>
                    {services.map((s) => (
                      <option key={s._id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label-caps mb-2 block text-[10px] text-[#6B6B6B]">Mensaje</label>
                <textarea
                  rows={3}
                  value={lead.message}
                  onChange={(e) => setLead({ ...lead, message: e.target.value })}
                  placeholder="Cuéntanos en qué podemos ayudarte..."
                  className="w-full resize-none border-b border-[#E5E0D8] bg-transparent py-3 text-sm font-light text-[#0A0A0A] outline-none transition-colors placeholder:text-[#A8A29A] focus:border-[#C9A96E]"
                />
              </div>
              <div className="flex flex-col items-center gap-4 pt-2">
                <button type="submit" disabled={leadStatus === 'sending'} className="btn-primary w-full disabled:opacity-50 md:w-auto md:px-16">
                  {leadStatus === 'sending' ? 'Enviando...' : 'Enviar Mensaje'}
                </button>
                {leadStatus === 'sent' && (
                  <p className="text-sm font-light text-emerald-700">Mensaje enviado. Te contactaremos pronto.</p>
                )}
                {leadStatus === 'error' && (
                  <p className="text-sm font-light text-red-600">Error al enviar. Intenta de nuevo o usa WhatsApp.</p>
                )}
              </div>
            </form>

            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a href={reserveHref} className="btn-primary px-12">
                Reservar Cita
              </a>
              {whatsapp && (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn-ghost px-12">
                  WhatsApp
                </a>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-[#E5E0D8] bg-[#0A0A0A] py-10 text-center">
        <p className="mb-2 text-[#F7F3EE]/80">
          &copy; {new Date().getFullYear()} {config.name}. Todos los derechos reservados.
        </p>
        <p className="text-sm text-[#F7F3EE]/40">
          Powered by <span className="font-semibold text-[#C9A96E]">SmartKubik</span>
        </p>
      </footer>
    </div>
  );
}
