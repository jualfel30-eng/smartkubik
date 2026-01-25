import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web';
// Import JSON directly - bundled with the app, no network fetch needed
import rubikAnimation from '@/assets/rubik_cube_loader.json';

/**
 * Componente de loader con animación de Cubo Rubik
 * Usa lottie-web directamente para mejor compatibilidad con Safari iOS
 */
export const RubikLoader = ({
  size = 120,
  message = 'Cargando...',
  fullScreen = false
}) => {
  const containerRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Destroy previous animation if exists
    if (animationRef.current) {
      animationRef.current.destroy();
    }

    // Create animation using lottie-web directly
    // Safari iOS: use autoplay: false and manually trigger play()
    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: false, // Disabled - we'll manually play for Safari iOS
      animationData: rubikAnimation,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet'
      }
    });

    animationRef.current = anim;

    // Safari iOS fix: manually trigger play after animation is loaded
    anim.addEventListener('DOMLoaded', () => {
      anim.play();
    });

    // Fallback: force play after a short delay if DOMLoaded doesn't fire
    const playTimeout = setTimeout(() => {
      if (animationRef.current) {
        animationRef.current.goToAndPlay(0, true);
      }
    }, 100);

    // Keep animation playing when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && animationRef.current) {
        animationRef.current.goToAndPlay(0, true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(playTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animationRef.current) {
        animationRef.current.destroy();
        animationRef.current = null;
      }
    };
  }, []);

  const containerClass = fullScreen
    ? 'fixed inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50'
    : 'flex flex-col items-center justify-center p-8';

  return (
    <div className={containerClass}>
      <div
        ref={containerRef}
        style={{
          width: size,
          height: size,
        }}
      />
      {message && (
        <p className="mt-4 text-sm text-muted-foreground animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};

export default RubikLoader;
