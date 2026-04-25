'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Skip Lenis on low-end devices to prevent jank and battery drain
    const isLowEnd =
      (typeof navigator !== 'undefined' && 'hardwareConcurrency' in navigator && (navigator as any).hardwareConcurrency <= 4) ||
      (typeof navigator !== 'undefined' && 'deviceMemory' in navigator && (navigator as any).deviceMemory <= 4);

    if (isLowEnd) {
      // Use CSS smooth scrolling as fallback
      document.documentElement.style.scrollBehavior = 'smooth';
      return () => { document.documentElement.style.scrollBehavior = ''; };
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
