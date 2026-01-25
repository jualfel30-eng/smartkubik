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
    animationRef.current = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: rubikAnimation,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid slice',
        progressiveLoad: false,
        hideOnTransparent: true,
        className: 'lottie-svg-class'
      }
    });

    // Safari iOS fix: ensure animation keeps playing
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && animationRef.current) {
        animationRef.current.play();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
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
