import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getStorefrontConfig } from '@/lib/api';
import { getBeautyServiceById, getBeautyServices } from '@/lib/beautyApi';
import BeforeAfterSlider from '@/templates/BeautyStorefront/components/BeforeAfterSlider';
import '@/templates/HealthStorefront/health.css';

const SERVICE_FALLBACK =
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200&q=80';

interface DetailProps {
  params: Promise<{ domain: string; id: string }>;
}

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

export default async function HealthServiceDetailPage({ params }: DetailProps) {
  const { domain, id } = await params;

  let config;
  try {
    config = await getStorefrontConfig(domain);
  } catch {
    notFound();
  }
  const cfg = config as any;
  if (!cfg || cfg.templateType !== 'health') notFound();

  const tenantId = typeof cfg.tenantId === 'object' ? cfg.tenantId._id : cfg.tenantId;

  const [service, allServices] = await Promise.all([
    getBeautyServiceById(tenantId, id),
    getBeautyServices(tenantId),
  ]);

  if (!service) notFound();

  const related = allServices
    .filter((s) => s._id !== service._id && s.category === service.category)
    .slice(0, 3);

  const heroImg = service.images?.[0] || SERVICE_FALLBACK;
  const reserveHref = `/${domain}/health/reservar?serviceId=${service._id}`;

  return (
    <div className="health-root min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#E5E0D8] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <a href={`/${domain}/health`} className="flex items-center gap-2 text-sm font-medium text-[#6B6B6B] transition hover:opacity-70">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </a>
          <span className="font-display tracking-[0.15em] text-[#0A0A0A]">{cfg.tenantId?.name || cfg.seo?.title || 'Clínica'}</span>
          <a href={reserveHref} className="btn-primary hidden px-6 py-2.5 text-[10px] sm:inline-flex">
            Reservar
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative h-[42vh] min-h-[320px] w-full overflow-hidden">
        <Image src={heroImg} alt={service.name} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-[#0A0A0A]/35" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <p className="label-caps mb-4 text-[11px] tracking-[0.25em] text-white/80">{service.category}</p>
          <h1 className="font-display text-[clamp(2.2rem,5vw,3.8rem)] font-light leading-tight text-white">
            {service.name}
          </h1>
        </div>
      </section>

      {/* Description */}
      {service.description && (
        <div className="mx-auto max-w-3xl px-8 py-16 text-center md:py-20">
          <p className="text-[17px] font-light leading-[1.9] text-[#6B6B6B]">{service.description}</p>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-6 pb-20 md:px-12">
        {/* Price & CTA */}
        <div className="mx-auto mb-20 max-w-md border border-[#E5E0D8] bg-white p-10 text-center">
          <p className="label-caps mb-3 text-[10px] text-[#A8A29A]">Precio desde</p>
          <p className="font-display text-4xl font-light text-[#0A0A0A]">
            {formatPrice(service.price.amount, service.price.currency)}
          </p>
          <div className="mx-auto mt-5 flex items-center justify-center gap-2.5 text-sm font-light text-[#6B6B6B]">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2">
              <circle cx="7.5" cy="7.5" r="6" />
              <path d="M7.5 4.5v3l2 2" strokeLinecap="round" />
            </svg>
            {service.duration} minutos
          </div>
          <div className="mt-8 h-px bg-[#E5E0D8]" />
          <a href={reserveHref} className="btn-primary mt-8 inline-block w-full text-center">
            Reservar Cita
          </a>
        </div>

        {/* Benefits */}
        {service.benefits && service.benefits.length > 0 && (
          <div className="mx-auto max-w-2xl text-center">
            <p className="label-caps mb-4 text-[11px] text-[#C9A96E]">Ventajas</p>
            <h2 className="font-display text-2xl font-light text-[#0A0A0A]">Beneficios</h2>
            <div className="mx-auto mt-4 h-px w-8 bg-[#C9A96E]/40" />
            <ul className="mt-10 space-y-5 text-left">
              {service.benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-4">
                  <span className="mt-0.5 text-sm text-[#C9A96E]">&#10022;</span>
                  <span className="text-[15px] font-light leading-relaxed text-[#6B6B6B]">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Before / After */}
        {service.beforeAfter && service.beforeAfter.length > 0 && (
          <div className="mx-auto mt-20 max-w-3xl text-center">
            <p className="label-caps mb-4 text-[11px] text-[#C9A96E]">Resultados</p>
            <h2 className="font-display text-2xl font-light text-[#0A0A0A]">Antes y Después</h2>
            <div className="mx-auto mt-4 h-px w-8 bg-[#C9A96E]/40" />
            <div className="mt-10 space-y-8">
              {service.beforeAfter.map((ba, i) => (
                <div key={i}>
                  <BeforeAfterSlider beforeImage={ba.before} afterImage={ba.after} alt={ba.label || service.name} />
                  {ba.label && <p className="mt-3 text-sm font-light text-[#6B6B6B]">{ba.label}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gallery (imágenes adicionales) */}
        {service.images && service.images.length > 1 && (
          <div className="mx-auto mt-20 max-w-3xl text-center">
            <p className="label-caps mb-4 text-[11px] text-[#C9A96E]">Imágenes</p>
            <h2 className="font-display text-2xl font-light text-[#0A0A0A]">Galería</h2>
            <div className="mx-auto mt-4 h-px w-8 bg-[#C9A96E]/40" />
            <div className="mt-10 grid grid-cols-2 gap-4">
              {service.images.slice(1).map((img, i) => (
                <div key={i} className="relative aspect-square overflow-hidden">
                  <Image src={img} alt={`${service.name} ${i + 1}`} fill className="object-cover transition-transform duration-500 hover:scale-105" sizes="(max-width:768px) 50vw, 33vw" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-28 border-t border-[#E5E0D8] pt-20 text-center">
            <p className="label-caps mb-4 text-[11px] text-[#C9A96E]">También te puede interesar</p>
            <h2 className="font-display text-2xl font-light text-[#0A0A0A]">Servicios Relacionados</h2>
            <div className="mx-auto mt-4 h-px w-8 bg-[#C9A96E]/40" />
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              {related.map((s) => (
                <a
                  key={s._id}
                  href={`/${domain}/health/servicios/${s._id}`}
                  className="group block border border-[#E5E0D8] bg-white text-center transition-all duration-500 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image src={s.images?.[0] || SERVICE_FALLBACK} alt={s.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width:768px) 100vw, 33vw" />
                  </div>
                  <div className="p-7">
                    <h3 className="font-display text-lg text-[#0A0A0A]">{s.name}</h3>
                    <p className="mt-2 text-sm font-light text-[#6B6B6B]">
                      Desde {formatPrice(s.price.amount, s.price.currency)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-[#E5E0D8] bg-[#0A0A0A] py-10 text-center">
        <p className="text-sm text-[#F7F3EE]/60">
          Powered by <span className="font-semibold text-[#C9A96E]">SmartKubik</span>
        </p>
      </footer>
    </div>
  );
}
