'use client';

interface BeautyHeroProps {
  config: {
    name: string;
    description: string;
    bannerUrl?: string;
  };
  primaryColor: string;
  secondaryColor: string;
  domain?: string;
}

export default function BeautyHero({
  config,
  primaryColor,
  secondaryColor,
  domain,
}: BeautyHeroProps) {
  return (
    <section
      className="relative py-24 text-white overflow-hidden"
      style={{
        background: config.bannerUrl
          ? `url(${config.bannerUrl}) center/cover`
          : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
      }}
    >
      {config.bannerUrl && (
        <div className="absolute inset-0 bg-black/40" />
      )}

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fade-in">
            {config.name}
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90">
            {config.description}
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href={`/${domain}/beauty/reservar`}
              className="px-8 py-4 bg-white text-gray-900 rounded-full font-bold text-lg hover:scale-105 transition transform shadow-xl"
            >
              Reservar Ahora
            </a>
            <a
              href="#servicios"
              className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white rounded-full font-bold text-lg hover:bg-white/30 transition border-2 border-white"
            >
              Ver Servicios
            </a>
          </div>
        </div>
      </div>

      {/* Decorative wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full"
        >
          <path
            d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z"
            fill="white"
          />
        </svg>
      </div>
    </section>
  );
}
