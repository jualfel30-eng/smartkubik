import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import testimonials from '@/data/testimonials';

// Animated counter that counts up when scrolled into view
const AnimatedCounter = ({ end, suffix = '', prefix = '' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 2000;
          const startTime = performance.now();

          const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(animate);
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end]);

  return (
    <span ref={ref}>
      {prefix}{count}{suffix}
    </span>
  );
};

const METRICS = [
  { value: 12, suffix: '+', label: 'Negocios activos', labelEn: 'Active businesses' },
  { value: 40, suffix: '%', label: 'Menos merma promedio', labelEn: 'Less waste on average' },
  { value: 3, suffix: 'h', label: 'Ahorradas al día', labelEn: 'Saved per day' },
  { value: 99, suffix: '%', label: 'Uptime garantizado', labelEn: 'Guaranteed uptime' },
];

const SocialProofSection = ({ language = 'es' }) => {
  return (
    <section className="py-24 relative overflow-hidden" style={{
      background: 'linear-gradient(180deg, #050810 0%, #0A1628 50%, #050810 100%)'
    }}>
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px]"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Headline */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
            <span className={`lang-es ${language === 'es' ? '' : 'hidden'}`}>
              Negocios reales,{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                resultados reales
              </span>
            </span>
            <span className={`lang-en ${language === 'en' ? '' : 'hidden'}`}>
              Real businesses,{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                real results
              </span>
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            <span className={`lang-es ${language === 'es' ? '' : 'hidden'}`}>
              Dueños de negocios como tú ya están transformando su operación
            </span>
            <span className={`lang-en ${language === 'en' ? '' : 'hidden'}`}>
              Business owners like you are already transforming their operations
            </span>
          </p>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          {METRICS.map((metric, i) => (
            <div
              key={i}
              className="text-center p-6 rounded-2xl border border-white/10 backdrop-blur-sm"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                <AnimatedCounter end={metric.value} suffix={metric.suffix} />
              </div>
              <p className="text-sm text-gray-400">
                <span className={`lang-es ${language === 'es' ? '' : 'hidden'}`}>{metric.label}</span>
                <span className={`lang-en ${language === 'en' ? '' : 'hidden'}`}>{metric.labelEn}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.slice(0, 3).map((t) => (
            <div
              key={t.id}
              className="relative p-6 rounded-2xl border border-white/10 transition-all duration-300 group"
              style={{ background: 'rgba(255,255,255,0.03)' }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }}
            >
              {/* Quote icon */}
              <svg className="w-8 h-8 text-cyan-500/30 mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.731-9.57 8.983-10.609l.998 2.151c-2.433.917-3.998 3.638-3.998 5.849h4.015v10h-9.998z" />
              </svg>

              {/* Quote text */}
              <p className="text-gray-300 leading-relaxed mb-6 text-[15px]">
                "{t.quote}"
              </p>

              {/* Metric badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4"
                style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                {t.metric}
              </div>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                {/* Initials avatar */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${
                      t.vertical === 'restaurant' ? '#06b6d4, #0891b2' : '#10b981, #059669'
                    })`
                  }}>
                  {t.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{t.name}</p>
                  <p className="text-gray-500 text-xs">{t.role} — {t.business}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom row: 2 more testimonials centered */}
        <div className="grid md:grid-cols-2 gap-6 mt-6 max-w-4xl mx-auto">
          {testimonials.slice(3, 5).map((t) => (
            <div
              key={t.id}
              className="relative p-6 rounded-2xl border border-white/10 transition-all duration-300"
              style={{ background: 'rgba(255,255,255,0.03)' }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }}
            >
              <svg className="w-8 h-8 text-cyan-500/30 mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.731-9.57 8.983-10.609l.998 2.151c-2.433.917-3.998 3.638-3.998 5.849h4.015v10h-9.998z" />
              </svg>

              <p className="text-gray-300 leading-relaxed mb-6 text-[15px]">
                "{t.quote}"
              </p>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4"
                style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                {t.metric}
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${
                      t.vertical === 'restaurant' ? '#06b6d4, #0891b2' : '#10b981, #059669'
                    })`
                  }}>
                  {t.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{t.name}</p>
                  <p className="text-gray-500 text-xs">{t.role} — {t.business}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-semibold text-lg transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
              boxShadow: '0 8px 30px rgba(6, 182, 212, 0.3)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(6, 182, 212, 0.5)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(6, 182, 212, 0.3)';
            }}
          >
            <span className={`lang-es ${language === 'es' ? '' : 'hidden'}`}>Probar Gratis 14 Días</span>
            <span className={`lang-en ${language === 'en' ? '' : 'hidden'}`}>Try Free for 14 Days</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <p className="text-gray-500 text-sm mt-3">
            <span className={`lang-es ${language === 'es' ? '' : 'hidden'}`}>Sin tarjeta de crédito · Setup en 15 minutos</span>
            <span className={`lang-en ${language === 'en' ? '' : 'hidden'}`}>No credit card · Setup in 15 minutes</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
