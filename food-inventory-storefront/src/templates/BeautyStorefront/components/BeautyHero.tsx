'use client';

import { useCallback } from 'react';
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
  googleRating?: number;
  googleReviewCount?: number;
  reviewCount?: number;
}

export default function BeautyHero({
  config,
  primaryColor,
  secondaryColor,
  domain,
  googleRating,
  googleReviewCount,
  reviewCount,
}: BeautyHeroProps) {
  // Safari bug: React's `muted` prop doesn't set the DOM `muted` attribute.
  // useCallback ref fires synchronously when the node is created (before browser
  // autoplay policy runs), ensuring muted is set before play() is called.
  const videoRef = useCallback((node: HTMLVideoElement | null) => {
    if (!node) return;
    node.muted = true;
    node.play().catch(() => {
      // Autoplay blocked — silently ignore
    });
  }, []);

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
          ref={videoRef}
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0 }}
          // webkit-playsinline is needed for older iOS Safari
          {...({ 'webkit-playsinline': 'true' } as any)}
        >
          <source src={config.videoUrl} type="video/mp4" />
          <source src={config.videoUrl} type="video/quicktime" />
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
          {/* Social proof bar */}
          {(googleRating || (reviewCount && reviewCount > 0)) && (
            <motion.div
              className="flex items-center justify-center gap-3 mb-6 text-white/90 text-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              {googleRating && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-bold">{googleRating.toFixed(1)}</span>
                </span>
              )}
              {googleReviewCount && googleReviewCount > 0 && (
                <>
                  <span className="text-white/50">·</span>
                  <span>{googleReviewCount} reseñas en Google</span>
                </>
              )}
              {!googleRating && reviewCount && reviewCount > 0 && (
                <span>{reviewCount} reseñas</span>
              )}
            </motion.div>
          )}

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
