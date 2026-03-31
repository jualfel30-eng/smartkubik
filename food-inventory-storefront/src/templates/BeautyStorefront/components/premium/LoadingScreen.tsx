'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingScreen({ logoUrl, primaryColor }: { logoUrl?: string; primaryColor: string }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed inset-0 bg-luxury-black-900 z-[9999] flex items-center justify-center"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-32 h-32 object-contain" />
            ) : (
              <div
                className="w-20 h-20 border-4 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: `${primaryColor} transparent transparent transparent` }}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
