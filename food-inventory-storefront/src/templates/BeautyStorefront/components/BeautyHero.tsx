'use client';

import { motion } from 'framer-motion';
import type { ColorScheme } from '../BeautyStorefront';

interface BeautyHeroProps {
  config: {
    name: string;
    description: string;
    bannerUrl?: string;
    videoUrl?: string;
  };
  primaryColor: string;
  secondaryColor: string;
  domain?: string;
  colors: ColorScheme;
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
        background: !config.videoUrl && config.bannerUrl
          ? `url(${config.bannerUrl}) center/cover`
          : !config.videoUrl && !config.bannerUrl
          ? `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
          : '#000000',
      }}
    >
      {/* Video Background */}
      {config.videoUrl && (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0 }}
        >
          <source src={config.videoUrl} type="video/mp4" />
        </video>
      )}

      {/* Dark Overlay for video or image */}
      {(config.videoUrl || config.bannerUrl) && (
        <div className="absolute inset-0 bg-black/40" style={{ zIndex: 1 }} />
      )}

      <div className="container mx-auto px-4 relative z-30">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h1
            className="font-serif text-6xl md:text-display font-bold mb-6 tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {config.name}
          </motion.h1>
          <motion.p
            className="text-xl md:text-2xl mb-8 text-white/90 font-sans"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {config.description}
          </motion.p>
          <motion.div
            className="flex gap-4 justify-center flex-wrap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <motion.a
              href={`/${domain}/beauty/reservar`}
              className="px-8 py-4 bg-white text-gray-900 rounded-full font-bold text-lg shadow-xl"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              Reservar Ahora
            </motion.a>
            <motion.a
              href="#servicios"
              className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white rounded-full font-bold text-lg border-2 border-white"
              whileHover={{ scale: 1.05, y: -2, backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              Ver Servicios
            </motion.a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
