'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FloatingCTA({
  domain,
  primaryColor,
  secondaryColor,
}: {
  domain?: string;
  primaryColor: string;
  secondaryColor: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.a
          href={`/${domain}/beauty/reservar`}
          className="fixed bottom-8 right-8 z-40 px-6 py-4 rounded-full text-white font-semibold text-sm tracking-super uppercase shadow-2xl"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          Reservar Ahora
        </motion.a>
      )}
    </AnimatePresence>
  );
}
